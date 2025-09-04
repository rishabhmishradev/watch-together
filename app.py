from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import eventlet

# Eventlet monkey patching for async
eventlet.monkey_patch()

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret"
socketio = SocketIO(app, cors_allowed_origins="*")  # async_mode auto detect

@app.route("/")
def index():
    return render_template("index.html")

# Track connected users
connected_users = 0

@socketio.on("connect")
def handle_connect():
    global connected_users
    connected_users += 1
    socketio.emit("userCount", {"count": connected_users}, broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    global connected_users
    connected_users -= 1
    socketio.emit("userCount", {"count": connected_users}, broadcast=True)

# Handle load video
@socketio.on("load_video")
def handle_load_video(data):
    socketio.emit("load_video", data, broadcast=True)

# Handle play/pause/seek sync
@socketio.on("controlVideo")
def handle_control_video(data):
    socketio.emit("controlVideo", data, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
