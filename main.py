import cv2
import numpy as np
import os
import time
import requests
from datetime import datetime
from insightface.app import FaceAnalysis


FOLDER_PATH = "faces"
SERVER_URL = "http://localhost:3000/api/log"

# AI Settings
SIMILARITY_THRESHOLD = 0.5  # 0.5 is balanced. Higher = Stricter.
SKIP_FRAMES = 5             # Process 1 frame, skip 5 (Saves CPU)

# Alert Settings (Seconds)
COOLDOWN_UNKNOWN = 10       # How often to alert for intruders
COOLDOWN_KNOWN = 60         # How often to log authorized students
# ==========================================

def init_insightface():
    """Initializes the lightweight AI model"""
    print("Loading AI Model (buffalo_sc)...")
    app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app

def load_known_faces(app, folder_path):
    """Scans the 'faces' folder and learns all faces"""
    known_embeddings = []
    known_names = []
    
    print(f"\nScanning '{folder_path}' for known faces...")
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        return [], []

    # Walk through the directory structure
    for item_name in os.listdir(folder_path):
        item_path = os.path.join(folder_path, item_name)
        
        # We only look inside subfolders (e.g., faces/student1/)
        if os.path.isdir(item_path):
            person_name = item_name
            loaded_count = 0
            
            for filename in os.listdir(item_path):
                if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                    img_path = os.path.join(item_path, filename)
                    img = cv2.imread(img_path)
                    if img is None: continue
                    
                    faces = app.get(img)
                    if len(faces) > 0:
                        # Take the largest face in the photo
                        largest_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)[0]
                        known_embeddings.append(largest_face.embedding)
                        known_names.append(person_name)
                        loaded_count += 1
            
            if loaded_count > 0:
                print(f" -> Loaded {loaded_count} images for: {person_name}")
    
    print(f"Total Database Size: {len(known_embeddings)} faces.\n")
    return known_embeddings, known_names

def send_log(name, frame=None):
    """Sends data to Node.js backend"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = { 'name': name, 'timestamp': timestamp }
        files = None

        # If it's an intruder (Unknown), we attach the image
        if name == "Unknown" and frame is not None:
            # Compress image to JPG in memory
            _, img_encoded = cv2.imencode('.jpg', frame)
            files = { 'image': ('intruder.jpg', img_encoded.tobytes(), 'image/jpeg') }
            print(f" [ALERT] Sending Intruder Photo to Server...")
        else:
            print(f" [LOG] Logging attendance for: {name}")

        # Send Request
        requests.post(SERVER_URL, data=data, files=files)
        
    except Exception as e:
        print(f" [ERROR] Could not connect to server: {e}")

def main():
    # 1. Setup
    app = init_insightface()
    known_embeddings, known_names = load_known_faces(app, FOLDER_PATH)
    
    # Prepare Math for Fast Matching
    if known_embeddings:
        known_embeddings_norm = [e / np.linalg.norm(e) for e in known_embeddings]
        known_matrix = np.array(known_embeddings_norm)
    else:
        known_matrix = None
        print("WARNING: No known faces found. Everyone will be 'Unknown'.")

    # 2. Start Camera
    cap = cv2.VideoCapture(0)
    
    frame_count = 0
    saved_faces = [] 
    last_logged = {} # Dictionary to track cooldowns: {"Student1": 1700001, "Unknown": 1700005}

    print("\nSystem Online. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret: break

        # 3. AI Processing (Skipping frames for speed)
        if frame_count % SKIP_FRAMES == 0:
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            faces = app.get(small_frame)
            
            temp_results = []
            
            for face in faces:
                # Scale coordinates back up
                bbox = face.bbox.astype(int) * 2
                
                name = "Unknown"
                score = 0.0
                color = (0, 0, 255) # Red for Unknown

                # Identity Check
                if known_matrix is not None:
                    embedding = face.embedding
                    embedding_norm = embedding / np.linalg.norm(embedding)
                    similarities = np.dot(known_matrix, embedding_norm)
                    best_idx = np.argmax(similarities)
                    score = similarities[best_idx]

                    if score > SIMILARITY_THRESHOLD:
                        name = known_names[best_idx]
                        color = (0, 255, 0) # Green for Known

                temp_results.append((bbox, name, score, color))

                # --- LOGGING LOGIC ---
                current_time = time.time()
                last_time = last_logged.get(name, 0)
                
                # Determine Cooldown (Intruders get logged more often than students)
                cooldown = COOLDOWN_UNKNOWN if name == "Unknown" else COOLDOWN_KNOWN
                
                if current_time - last_time > cooldown:
                    if name == "Unknown":
                        send_log(name, frame) # Send Image
                    else:
                        send_log(name)        # Send Text Only
                    
                    last_logged[name] = current_time
                # ---------------------

            saved_faces = temp_results

        # 4. Drawing on Screen
        for (bbox, name, score, color) in saved_faces:
            cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)
            
            label = f"{name} ({score:.2f})"
            cv2.rectangle(frame, (bbox[0], bbox[3] - 30), (bbox[2], bbox[3]), color, cv2.FILLED)
            cv2.putText(frame, label, (bbox[0] + 5, bbox[3] - 8), 
                        cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 1)

        cv2.imshow('Security Camera', frame)
        frame_count += 1

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()