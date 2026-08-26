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
from app.models.activity_log import ActivityLog

class MeetingSignalingTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        db.query(ActivityLog).delete()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).filter(User.email.in_(["meet_a@example.com", "meet_b@example.com"])).delete()
        db.commit()

        # Register User A
        res_a = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User Alpha", "email": "meet_a@example.com", "password": "password123"}
        )
        cls.token_a = res_a.json()["access_token"]
        cls.user_a_id = res_a.json()["user"]["id"]

        # Register User B
        res_b = cls.client.post(
            "/api/v1/auth/register",
            json={"name": "User Beta", "email": "meet_b@example.com", "password": "password123"}
        )
        cls.token_b = res_b.json()["access_token"]
        cls.user_b_id = res_b.json()["user"]["id"]

        # User A creates Group
        res_group = cls.client.post(
            "/api/v1/groups/",
            json={"name": "Virtual Meeting Group", "description": "Group for testing WebRTC signaling"},
            headers={"Authorization": f"Bearer {cls.token_a}"}
        )
        cls.group_id = res_group.json()["id"]

        # User B joins Group
        cls.client.post(
            f"/api/v1/groups/{cls.group_id}/join",
            headers={"Authorization": f"Bearer {cls.token_b}"}
        )
        db.close()

    def test_webrtc_signaling_sequence(self):
        # 1. Connect User A WebSocket
        with self.client.websocket_connect(f"/api/v1/groups/{self.group_id}/meeting/ws?token={self.token_a}") as ws_a:
            init_a = ws_a.receive_json()
            self.assertEqual(init_a["type"], "room_state")
            self.assertEqual(len(init_a["existing_participants"]), 0)

            # 2. Connect User B WebSocket
            with self.client.websocket_connect(f"/api/v1/groups/{self.group_id}/meeting/ws?token={self.token_b}") as ws_b:
                init_b = ws_b.receive_json()
                self.assertEqual(init_b["type"], "room_state")
                self.assertEqual(len(init_b["existing_participants"]), 1)
                self.assertEqual(init_b["existing_participants"][0]["user_id"], self.user_a_id)

                # User A receives participant_joined for User B
                joined_notice_a = ws_a.receive_json()
                self.assertEqual(joined_notice_a["type"], "participant_joined")
                self.assertEqual(joined_notice_a["user_id"], self.user_b_id)

                # 3. User B sends SDP Offer to User A
                offer_payload = {
                    "type": "offer",
                    "target_id": self.user_a_id,
                    "sdp": "v=0\r\no=- 12345678 2 IN IP4 127.0.0.1..."
                }
                ws_b.send_json(offer_payload)

                # User A receives offer
                recv_offer_a = ws_a.receive_json()
                self.assertEqual(recv_offer_a["type"], "offer")
                self.assertEqual(recv_offer_a["sender_id"], self.user_b_id)
                self.assertEqual(recv_offer_a["sdp"], offer_payload["sdp"])

                # 4. User A sends SDP Answer back to User B
                answer_payload = {
                    "type": "answer",
                    "target_id": self.user_b_id,
                    "sdp": "v=0\r\no=- 87654321 2 IN IP4 127.0.0.1..."
                }
                ws_a.send_json(answer_payload)

                # User B receives answer
                recv_answer_b = ws_b.receive_json()
                self.assertEqual(recv_answer_b["type"], "answer")
                self.assertEqual(recv_answer_b["sender_id"], self.user_a_id)
                self.assertEqual(recv_answer_b["sdp"], answer_payload["sdp"])

                # 5. User A sends ICE Candidate to User B
                ice_payload = {
                    "type": "ice_candidate",
                    "target_id": self.user_b_id,
                    "candidate": {"candidate": "candidate:1 1 UDP 2122260223 127.0.0.1 54321 typ host", "sdpMid": "0"}
                }
                ws_a.send_json(ice_payload)

                # User B receives ICE Candidate
                recv_ice_b = ws_b.receive_json()
                self.assertEqual(recv_ice_b["type"], "ice_candidate")
                self.assertEqual(recv_ice_b["sender_id"], self.user_a_id)

                # 6. User B sends toggle_media (Mute Microphone)
                ws_b.send_json({"type": "toggle_media", "audio_enabled": False, "video_enabled": True})
                recv_toggle_a = ws_a.receive_json()
                self.assertEqual(recv_toggle_a["type"], "toggle_media")
                self.assertEqual(recv_toggle_a["audio_enabled"], False)

            # 7. User B disconnected -> User A receives participant_left
            left_notice_a = ws_a.receive_json()
            self.assertEqual(left_notice_a["type"], "participant_left")
            self.assertEqual(left_notice_a["user_id"], self.user_b_id)

        # 8. Check Activity Logs in PostgreSQL
        db = SessionLocal()
        logs = db.query(ActivityLog).filter(ActivityLog.activity_type.in_(["join_study_meeting", "leave_study_meeting"])).all()
        self.assertTrue(len(logs) >= 2)
        db.close()

if __name__ == "__main__":
    unittest.main()
