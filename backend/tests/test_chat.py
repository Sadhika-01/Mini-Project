import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.chat import GroupMessage

class ChatWebsocketTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(GroupMessage).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email.in_(["chat_a@example.com", "chat_b@example.com"])).delete()
        db.commit()

        # Register User A
        res_a = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User Alpha", "email": "chat_a@example.com", "password": "password123"}
        )
        cls.token_a = res_a.json()["access_token"]
        cls.user_a_id = res_a.json()["user"]["id"]

        # Register User B
        res_b = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User Beta", "email": "chat_b@example.com", "password": "password123"}
        )
        cls.token_b = res_b.json()["access_token"]
        cls.user_b_id = res_b.json()["user"]["id"]

        # User A creates Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "WebSocket Test Group", "description": "Group for live chat test"},
            headers={"Authorization": f"Bearer {cls.token_a}"}
        )
        cls.group_id = res_group.json()["id"]

        # User B joins Group
        cls.client.post(
            f"/api/v1/groups/{cls.group_id}/join",
            headers={"Authorization": f"Bearer {cls.token_b}"}
        )
        db.close()

    def test_realtime_websocket_chat(self):
        # 1. Connect User A and User B via WebSockets
        with self.client.websocket_connect(f"/api/v1/groups/{self.group_id}/ws?token={self.token_a}") as ws_a:
            with self.client.websocket_connect(f"/api/v1/groups/{self.group_id}/ws?token={self.token_b}") as ws_b:
                
                # User A sends message
                ws_a.send_json({"message_text": "Hello User B from real-time WebSockets!"})

                # Both receive broadcast
                data_a = ws_a.receive_json()
                data_b = ws_b.receive_json()

                self.assertEqual(data_a["message_text"], "Hello User B from real-time WebSockets!")
                self.assertEqual(data_b["message_text"], "Hello User B from real-time WebSockets!")
                self.assertEqual(data_b["sender_name"], "User Alpha")

        # 2. Verify REST Chat History API
        res_history = self.client.get(
            f"/api/v1/groups/{self.group_id}/messages",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_history.status_code, 200)
        history = res_history.json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["message_text"], "Hello User B from real-time WebSockets!")

if __name__ == "__main__":
    unittest.main()
