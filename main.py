import cv2
import numpy as np
import time
import requests
import base64
from datetime import datetime
from insightface.app import FaceAnalysis

# ==========================================
# 👇 PASTE YOUR VERCEL LINK HERE 👇
# ==========================================
# Do not add a trailing slash (e.g., use "https://myapp.vercel.app")
SERVER_URL = "https://hostel-security.vercel.app" 
# ==========================================

# AI Settings
SIMILARITY_THRESHOLD = 0.5  # 0.5 is balanced.
SKIP_FRAMES = 5             # Optimization

# Alert Settings (Seconds)
COOLDOWN_UNKNOWN = 10       
COOLDOWN_KNOWN = 60         

def init_insightface():
    """Initializes the lightweight AI model"""
    print("Loading AI Model (buffalo_sc)...")
    app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app

def load_faces_from_cloud(app):
    """
    Downloads registered students from MongoDB (via Vercel) 
    and generates embeddings using InsightFace.
    """
    known_embeddings = []
    known_names = []
    
    print(f"\n[CLOUD] Fetching students from {SERVER_URL}/api/students...")
    
    try:
        response = requests.get(f"{SERVER_URL}/api/students")
        if response.status_code != 200:
            print(f"[ERROR] Failed to connect to server: {response.status_code}")
            return [], []

        students = response.json()
        loaded_count = 0

        for student in students:
            name = student['name']
            img_data_b64 = student.get('imageData')

            if img_data_b64:
                try:
                    # 1. Decode Base64 string back to image bytes
                    img_bytes = base64.b64decode(img_data_b64)
                    np_arr = np.frombuffer(img_bytes, np.uint8)
                    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                    # 2. Use InsightFace to get the embedding
                    faces = app.get(img)
                    
                    if len(faces) > 0:
                        # Take the largest face in the database photo
                        largest_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)[0]
                        known_embeddings.append(largest_face.embedding)
                        known_names.append(name)
                        loaded_count += 1
                        print(f" -> Learned face for: {name}")
                except Exception as e:
                    print(f" -> Error loading {name}: {e}")

        print(f"Total Cloud Faces Loaded: {loaded_count}\n")
        return known_embeddings, known_names

    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return [], []

def send_log(name, frame=None):
    """Sends data to Vercel backend"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = { 'name': name, 'timestamp': timestamp }
        files = None

        if name == "Unknown" and frame is not None:
            # Compress image to JPG for upload
            _, img_encoded = cv2.imencode('.jpg', frame)
            files = { 'image': ('intruder.jpg', img_encoded.tobytes(), 'image/jpeg') }
            print(f" [ALERT] Uploading Intruder Photo to Cloud...")
        else:
            print(f" [LOG] Syncing attendance: {name}")

        # Send Request to Vercel
        requests.post(f"{SERVER_URL}/api/log", data=data, files=files)
        
    except Exception as e:
        print(f" [ERROR] Could not upload log: {e}")

def main():
    # 1. Setup
    app = init_insightface()
    
    # OLD: load_known_faces(app, FOLDER_PATH)
    # NEW: load_faces_from_cloud(app)
    known_embeddings, known_names = load_faces_from_cloud(app)
    
    # Prepare Math for Fast Matching
    known_matrix = None
    if known_embeddings:
        # Normalize embeddings for Cosine Similarity
        known_embeddings_norm = [e / np.linalg.norm(e) for e in known_embeddings]
        known_matrix = np.array(known_embeddings_norm)
    else:
        print("WARNING: No known faces found in Database. Everyone will be 'Unknown'.")

    # 2. Start Camera
    cap = cv2.VideoCapture(0)
    
    frame_count = 0
    saved_faces = [] 
    last_logged = {} 

    print("\nSystem Online. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret: break

        # 3. AI Processing
        if frame_count % SKIP_FRAMES == 0:
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            faces = app.get(small_frame)
            
            temp_results = []
            
            for face in faces:
                bbox = face.bbox.astype(int) * 2
                
                name = "Unknown"
                score = 0.0
                color = (0, 0, 255) # Red

                # Identity Check
                if known_matrix is not None:
                    embedding = face.embedding
                    embedding_norm = embedding / np.linalg.norm(embedding)
                    similarities = np.dot(known_matrix, embedding_norm)
                    best_idx = np.argmax(similarities)
                    score = similarities[best_idx]

                    if score > SIMILARITY_THRESHOLD:
                        name = known_names[best_idx]
                        color = (0, 255, 0) # Green

                temp_results.append((bbox, name, score, color))

                # --- LOGGING LOGIC ---
                current_time = time.time()
                last_time = last_logged.get(name, 0)
                cooldown = COOLDOWN_UNKNOWN if name == "Unknown" else COOLDOWN_KNOWN
                
                if current_time - last_time > cooldown:
                    if name == "Unknown":
                        send_log(name, frame) 
                    else:
                        send_log(name)
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