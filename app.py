from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import time

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Store current video state with timestamp
current_video = {
    "videoId": "",
    "loaded": False,
    "isPlaying": False,
    "currentTime": 0,
    "lastUpdate": 0
}

# Track connected users
connected_users = set()

@app.route("/")
def index():
    return render_template("index.html")

# Handle new user connection
@socketio.on('connect')
def handle_connect():
    user_id = request.sid
    connected_users.add(user_id)
    user_count = len(connected_users)
    
    print(f"User connected: {user_id}")
    print(f"Total users: {user_count}")
    
    # Send current video to newly connected user
    if current_video["loaded"]:
        emit("loadVideo", current_video["videoId"])
        # If video is currently playing, sync the time
        if current_video["isPlaying"]:
            time_elapsed = time.time() - current_video["lastUpdate"]
            current_time = current_video["currentTime"] + time_elapsed
            emit("videoSync", {
                "action": "play",
                "time": current_time,
                "timestamp": int(time.time() * 1000)
            })
    
    # Broadcast updated user count to all clients
    emit("userCount", {"count": user_count}, broadcast=True)

# Handle load video
@socketio.on("loadVideo")
def handle_load_video(video_id):
    current_video["videoId"] = video_id
    current_video["loaded"] = True
    current_video["isPlaying"] = False
    current_video["currentTime"] = 0
    current_video["lastUpdate"] = time.time()
    
    emit("loadVideo", video_id, broadcast=True)
    print(f"Video loaded: {video_id}")

# Handle video sync (play/pause/seek with timestamp)
@socketio.on("videoSync")
def handle_video_sync(data):
    current_video["currentTime"] = data["time"]
    current_video["lastUpdate"] = time.time()
    
    if data["action"] == "play":
        current_video["isPlaying"] = True
    elif data["action"] == "pause":
        current_video["isPlaying"] = False
    elif data["action"] == "seek":
        current_video["isPlaying"] = False  # Usually seeking pauses
    
    # Broadcast to all clients
    emit("videoSync", data, broadcast=True)
    print(f"Video sync: {data['action']} at {data['time']:.2f}s")

# Handle disconnect
@socketio.on('disconnect')
def handle_disconnect():
    user_id = request.sid
    connected_users.discard(user_id)
    user_count = len(connected_users)
    
    print(f"User disconnected: {user_id}")
    print(f"Total users: {user_count}")
    
    # Broadcast updated user count to remaining clients
    emit("userCount", {"count": user_count}, broadcast=True)

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
