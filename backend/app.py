import http.server
import socketserver
import urllib.parse
import json
import os
import urllib.request
import urllib.error
from datetime import datetime

# Loading environment variables manually 
def load_env ():
    env = {}
    try:
        if os.path.exists(".env"):
            with open(".env", "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and '=' in line:
                        key, value = line.split('=', 1)
                        env[key.strip()] = value.strip()
                    
    except Exception as e:
        print(f"warning: could not load .env file: {e}")
    return env

ENV = load_env()
port = 5001

class StudentFlyHandler(http.server.SimpleHTTPRequestHandler):
    def set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.set_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/flights":
            self.handle_flight_search(parsed.query)
        elif parsed.path == "/health":
            self.handle_health_check()
        else:
            self.send_response(404)
            self.set_cors_headers()
            self.end_headers()
            self.wfile.write(b"Not Found")
        return

    def handle_health_check(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.set_cors_headers()
        self.end_headers()  
        response = {
            "status": "healthy",
            "service": "StudentFly Backend",
            "timestamp": datetime.now().isoformat()
        }                  
        self.wfile.write(json.dumps(response).encode())

    def handle_flight_search(self, query_string):
        query = urllib.parse.parse_qs(query_string)
        origin = query.get("origin", [""])[0].upper() 
        destination = query.get("destination", [""])[0].upper()
        date = query.get("date", [""])[0]

        #Validating parameters
        if not origin or not date:
            self.send_error_response(400, "Missing origin or date parameters.")  
            return

        # checking API key
        if not ENV.get("RAPIDAPI_KEY"):
            self.send_error_response(500, "API key not configured in .env file.")
            return
        try:
            from_local = f"{date}T00:00"
            to_local = f"{date}T23:59"
            url = (
                f"https://{ENV['RAPIDAPI_HOST']}/flights/airports/iata/"
                f"{origin}/{from_local}/{to_local}?withLeg=true"
            )
            req = urllib.request.Request(url)
            req.add_header("X-RapidAPI-Key", ENV["RAPIDAPI_KEY"])
            req.add_header("X-RapidAPI-Host", ENV["RAPIDAPI_HOST"])
   
            with urllib.request.urlopen(req, timeout=30) as response:

                    api_data =response.read().decode('utf-8')
                    flights_data = json.loads(api_data)

            processed_flights = self.process_for_frontend(flights_data, destination) 
                
            self.send_success_response(processed_flights)
            
        except urllib.error.HTTPError as e:
                error_msg = f"API Error {e.code}: {e.reason}"
                self.send_error_response(502, error_msg)
        except Exception as e:
                self.send_error_response(500, f"Server Error: {str(e)}")

    def process_for_frontend(self, api_data, destination_filter):  
        """Process AeroDataBox API respsonse to match your frontend format."""
        processed = []
        departures = api_data.get("departures", [])

        for flight in departures:

            arrival_data = flight.get('arrival', {}).get('airport', {}).get('iata', '')
            arrival_iata= arrival_data 
            if destination_filter and arrival_data != destination_filter.upper():
                continue 

            processed_flight = {
                'id': flight.get('number', ''),
                'airline': flight.get('airline', {}).get('name', 'unknown Airline'),
                'flightNumber': flight.get('number', ''),
                'departure': {
                    'airport': flight.get('departure', {}).get('airport', {}).get('iata', ''),
                    'time': flight.get('departure', {}).get('scheduledTime', {}).get('local', '')    
                },

                'arrival': {
                    'airport': arrival_iata,
                    'time': flight.get('arrival', {}).get('scheduledTime', {}).get('local', '')
                },

                'duration': self.calculate_duration(
                    flight.get('departure', {}).get('scheduledTime', {}).get('local', ''),
                    flight.get('arrival', {}).get('scheduledTime', {}).get('local', '')
                ),
                'stops': 0,
                'status': flight.get('status', 'Scheduled')
            }    
            processed.append(processed_flight)  
        return processed

    def calculate_duration(self, dep_time, arr_time):
        """Calculate flight duration from departure and arrival times."""
        try:

            dep = datetime.fromisoformat(dep_time.replace("Z", "+00:00"))
            arr = datetime.fromisoformat(arr_time.replace("Z", "+00:00"))

            duration = arr - dep
            hours = duration.seconds // 3600
            minutes = (duration.seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        except:
            return "2h 30m" #Default fallback


    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.set_cors_headers()
        self.end_headers()  
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.set_cors_headers()
        self.end_headers()
        error_response = {"error": True, "message": message}
        self.wfile.write(json.dumps(error_response).encode())

def main ():
        print("🚀 StudentFly Backend Server Starting... ") 
        print(f"🚏 port: {port}")
        print(f"🔑 API Key: {'Configured ✅' if ENV.get('RAPIDAPI_KEY') else 'Not Configured ❌'}")
        print(f"🌐 Endpoints:")
        print(f" -Health: http://localhost:{port}/health")
        print(f" -Flights: http://localhost:{port}/api/flights?origin=JFK&destination=LAX&date=2023-12-25")
        print("Press ctrl+c to stop the server.")

        try:

            with socketserver.TCPServer(("", port), StudentFlyHandler) as httpd:
                httpd.serve_forever() 
        except KeyboardInterrupt:
            print("\n🛑 Server Stopped by user.")
        except Exception as e:
            print(f"❌ Server Error: {e}")                  
                            
if __name__ == "__main__":
    main() 
                      
