import unittest
from app import app, quick_scan

class SlothOpsTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_homepage(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"SlothOps AI", response.data)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "ok")

    def test_empty_logs_rejected(self):
        response = self.client.post("/api/analyze", json={"logs": " "})
        self.assertEqual(response.status_code, 400)

    def test_quick_scan_disk(self):
        self.assertIn("Disk space issue", quick_scan("no space left on device"))

    def test_quick_scan_network(self):
        self.assertIn("Connection failure", quick_scan("connection refused"))

if __name__ == "__main__":
    unittest.main()
