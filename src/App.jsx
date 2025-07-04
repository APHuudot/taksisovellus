import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

const STATUS_OPTIONS = [
  { label: "Vapaa", color: "green" },
  { label: "Ajossa", color: "red" },
  { label: "Ei käytössä", color: "black" },
];

const USERS = [
  { pin: "1254", name: "Kuljettaja", admin: false },
  { pin: "7956", name: "Admin", admin: true },
];

function getInitialStatus() {
  return localStorage.getItem("status") || "Vapaa";
}
function getInitialRole() {
  return localStorage.getItem("role") || "";
}
function getInitialName() {
  return localStorage.getItem("name") || "";
}
function getInitialPin() {
  return localStorage.getItem("pin") || "";
}
function getInitialHistory() {
  const h = localStorage.getItem("history");
  return h ? JSON.parse(h) : [];
}
function saveHistory(history) {
  localStorage.setItem("history", JSON.stringify(history));
}

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [pin, setPin] = useState(getInitialPin());
  const [role, setRole] = useState(getInitialRole());
  const [name, setName] = useState(getInitialName());
  const [status, setStatus] = useState(getInitialStatus());
  const [pos, setPos] = useState(null);
  const [history, setHistory] = useState(getInitialHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");

  // PIN login
  function handleLogin(e) {
    e.preventDefault();
    const user = USERS.find((u) => u.pin === pin);
    if (!user) {
      setError("Väärä PIN-koodi!");
      return;
    }
    setName(user.name);
    setRole(user.admin ? "admin" : "user");
    setLoggedIn(true);
    localStorage.setItem("name", user.name);
    localStorage.setItem("role", user.admin ? "admin" : "user");
    localStorage.setItem("pin", pin);
    setError("");
  }

  // PIN vaihto (admin)
  function handlePinChange(e) {
    e.preventDefault();
    if (newPin.length < 4) {
      setError("PINin tulee olla vähintään 4 merkkiä.");
      return;
    }
    USERS[0].pin = newPin;
    localStorage.setItem("pin", newPin);
    setNewPin("");
    alert("PIN vaihdettu!");
    setShowAdmin(false);
  }

  // Sijainnin haku
  useEffect(() => {
    if (!loggedIn) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        // Tallenna historiaan
        const newHist = [
          ...history,
          {
            time: new Date().toLocaleTimeString(),
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            status,
          },
        ];
        setHistory(newHist);
        saveHistory(newHist);
      },
      (err) => {
        setError("Sijainnin hakeminen epäonnistui: " + err.message);
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line
  }, [loggedIn, status]);

  useEffect(() => {
    localStorage.setItem("status", status);
  }, [status]);

  function handleLogout() {
    setLoggedIn(false);
    setRole("");
    setName("");
    setPin("");
    localStorage.clear();
  }

  return (
    <div className="app-root">
      <h2 className="title">Jokisen Taksipalvelu</h2>
      {!loggedIn && (
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="password"
            value={pin}
            placeholder="Syötä PIN-koodi"
            onChange={(e) => setPin(e.target.value)}
            className="pin-input"
          />
          <button type="submit" className="main-btn">
            Kirjaudu
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      )}

      {loggedIn && (
        <div>
          <div className="topbar">
            <button className="main-btn" onClick={handleLogout}>Kirjaudu ulos</button>
            {role === "admin" && (
              <button className="main-btn" onClick={() => setShowAdmin((s) => !s)}>
                Asetukset
              </button>
            )}
          </div>

          <div className="card dark-card">
            <b>Käyttäjä:</b> {name}
            <br />
            <b>Status:</b>{" "}
            <span style={{ color: STATUS_OPTIONS.find(s => s.label === status)?.color }}>
              {status}
            </span>
            <br />
            <b>Sijainti:</b>{" "}
            {pos
              ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
              : "Ei saatavilla"}
          </div>

          <div className="status-row">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className="status-btn"
                style={{
                  background: opt.color,
                  opacity: status === opt.label ? 1 : 0.6,
                  border: status === opt.label ? "2px solid #fff" : "none"
                }}
                onClick={() => setStatus(opt.label)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Kartta */}
          <div className="map-wrap">
            {pos ? (
              <MapContainer
                center={[pos.lat, pos.lng]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[pos.lat, pos.lng]} icon={markerIcon}>
                  <Popup>
                    {name} <br />
                    {status}
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                Sijaintia haetaan...
              </div>
            )}
          </div>

          <button className="main-btn" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Piilota historia" : "Näytä sijaintihistoria"}
          </button>
          {showHistory && (
            <div className="history-box">
              <b>Sijaintihistoria (uusin ensin):</b>
              <ul>
                {history.slice().reverse().map((h, i) => (
                  <li key={i}>
                    {h.time} – {h.lat.toFixed(5)}, {h.lng.toFixed(5)} – {h.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showAdmin && role === "admin" && (
            <form onSubmit={handlePinChange} className="admin-form">
              <h4>Vaihda käyttäjä-PIN</h4>
              <input
                type="text"
                placeholder="Uusi PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="pin-input"
              />
              <button type="submit" className="main-btn">
                Vaihda PIN
              </button>
              {error && <div className="error">{error}</div>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
