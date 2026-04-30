"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales incorrectas. Verifica tu usuario y contraseña.");
      setLoading(false);
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .lw { min-height:100vh; display:flex; font-family:'Inter',-apple-system,sans-serif; background:#f1f5f9; }

        /* ── Panel izquierdo (branding) ── */
        .lb {
          display:none; width:50%;
          background:linear-gradient(145deg,#1e40af 0%,#1d4ed8 45%,#2563eb 100%);
          position:relative; overflow:hidden;
          flex-direction:column; align-items:center; justify-content:center;
          padding:60px 48px;
        }
        @media(min-width:900px){ .lb{ display:flex; } }

        .b1{ position:absolute; width:420px; height:420px; border-radius:50%; background:rgba(255,255,255,.06); top:-130px; right:-130px; }
        .b2{ position:absolute; width:320px; height:320px; border-radius:50%; background:rgba(255,255,255,.06); bottom:-90px; left:-90px; }
        .b3{ position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.04); top:55%; left:45%; transform:translate(-50%,-50%); }

        .lb-icon{
          width:88px; height:88px; border-radius:22px;
          background:rgba(255,255,255,.15); border:2px solid rgba(255,255,255,.3);
          display:flex; align-items:center; justify-content:center;
          margin-bottom:28px; backdrop-filter:blur(10px);
          font-size:42px;
        }
        .lb-title{
          font-size:26px; font-weight:900; color:#fff;
          text-align:center; line-height:1.18; letter-spacing:-0.03em;
          margin-bottom:10px;
        }
        .lb-sub{
          font-size:11px; font-weight:700; color:rgba(255,255,255,.6);
          text-align:center; letter-spacing:.14em; text-transform:uppercase;
          margin-bottom:44px;
        }
        .lb-features{ display:flex; flex-direction:column; gap:12px; width:100%; }
        .lb-feat{
          display:flex; align-items:center; gap:14px;
          background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.16);
          border-radius:12px; padding:13px 16px; backdrop-filter:blur(8px);
        }
        .lb-feat-ic{
          width:38px; height:38px; border-radius:9px;
          background:rgba(255,255,255,.14);
          display:flex; align-items:center; justify-content:center;
          font-size:20px; flex-shrink:0;
        }
        .lb-feat-t{ color:rgba(255,255,255,.92); font-size:14px; font-weight:700; }
        .lb-feat-s{ color:rgba(255,255,255,.5); font-size:12px; font-weight:500; margin-top:2px; }

        /* ── Panel derecho (formulario) ── */
        .lf{ flex:1; display:flex; align-items:center; justify-content:center; padding:32px 24px; }
        .li{ width:100%; max-width:420px; }

        /* Mobile logo */
        .ml{ display:flex; align-items:center; gap:12px; margin-bottom:28px; }
        @media(min-width:900px){ .ml{ display:none; } }
        .ml-ic{
          width:44px; height:44px; background:#1d4ed8; border-radius:10px;
          display:flex; align-items:center; justify-content:center; font-size:22px;
        }
        .ml-t{ font-size:15px; font-weight:800; color:#0f172a; line-height:1.2; }
        .ml-s{ font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:.08em; }

        /* Card */
        .fc{
          background:#fff; border-radius:20px;
          border:2px solid #e2e8f0;
          box-shadow:0 8px 32px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.05);
          padding:38px 34px;
        }
        .fc-eyebrow{ font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:.12em; margin-bottom:6px; }
        .fc-title{ font-size:25px; font-weight:800; color:#0f172a; letter-spacing:-.02em; }
        .fc-desc{ font-size:13px; font-weight:500; color:#64748b; margin-top:5px; margin-bottom:26px; }
        .fc-div{
          height:2px;
          background:linear-gradient(90deg,#1d4ed8,#93c5fd,transparent);
          border-radius:2px; margin-bottom:26px;
        }

        .field{ display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }
        .field-lbl{ font-size:13px; font-weight:700; color:#334155; display:flex; align-items:center; gap:6px; }
        .field-inp{
          width:100%; padding:13px 16px;
          font-size:15px; font-weight:500;
          border-radius:10px; border:2px solid #cbd5e1;
          background:#f8fafc; color:#0f172a; outline:none;
          transition:all .2s;
          font-family:'Inter',-apple-system,sans-serif;
        }
        .field-inp:focus{
          border-color:#1d4ed8; background:#fff;
          box-shadow:0 0 0 4px rgba(29,78,216,.1);
        }
        .field-inp::placeholder{ color:#94a3b8; font-weight:400; }

        .err{
          background:#fef2f2; border:2px solid #fecaca;
          border-radius:10px; padding:11px 15px;
          display:flex; align-items:flex-start; gap:9px;
          margin-bottom:16px;
          animation:shake .4s ease;
        }
        @keyframes shake{
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          60%{transform:translateX(6px)}
        }
        .err-txt{ font-size:13px; font-weight:600; color:#dc2626; }

        .btn-go{
          width:100%; padding:15px 24px;
          font-size:15px; font-weight:700; letter-spacing:.02em;
          border-radius:12px; border:none; cursor:pointer;
          background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);
          color:#fff;
          box-shadow:0 4px 16px rgba(29,78,216,.35);
          transition:all .2s;
          display:flex; align-items:center; justify-content:center; gap:10px;
          font-family:'Inter',-apple-system,sans-serif;
          margin-top:6px;
        }
        .btn-go:hover:not(:disabled){
          background:linear-gradient(135deg,#1e40af 0%,#1d4ed8 100%);
          transform:translateY(-1px);
          box-shadow:0 6px 20px rgba(29,78,216,.4);
        }
        .btn-go:disabled{ opacity:.72; cursor:not-allowed; transform:none; }

        .spin{
          width:18px; height:18px;
          border:2px solid rgba(255,255,255,.35);
          border-top-color:#fff; border-radius:50%;
          animation:rot .7s linear infinite;
        }
        @keyframes rot{ to{ transform:rotate(360deg); } }

        .ftr{
          text-align:center; margin-top:22px;
          font-size:12px; font-weight:500; color:#94a3b8;
        }
        .ftr span{ color:#1d4ed8; font-weight:700; }
      `}</style>

      <div className="lw">

        {/* ── PANEL IZQUIERDO — BRANDING ── */}
        <div className="lb">
          <div className="b1" /><div className="b2" /><div className="b3" />

          <div className="lb-icon">💊</div>
          <h1 className="lb-title">FARMACIA ARCHI<br/>DOMINICANA</h1>
          <p className="lb-sub">Sistema de Gestión Profesional</p>

          <div className="lb-features">
            {[
              { ic: "📦", t: "Inventario Inteligente",   s: "Control total de medicamentos" },
              { ic: "🧾", t: "Facturación Rápida",       s: "NCF y comprobantes digitales" },
              { ic: "📊", t: "Reportes en Tiempo Real",  s: "Análisis de ventas y ganancias" },
              { ic: "👥", t: "Gestión de Clientes",      s: "Historial y fidelización" },
            ].map((f) => (
              <div className="lb-feat" key={f.t}>
                <div className="lb-feat-ic">{f.ic}</div>
                <div>
                  <div className="lb-feat-t">{f.t}</div>
                  <div className="lb-feat-s">{f.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL DERECHO — FORMULARIO ── */}
        <div className="lf">
          <div className="li">

            {/* Logo solo en móvil */}
            <div className="ml">
              <div className="ml-ic">💊</div>
              <div>
                <div className="ml-t">FARMACIA ARCHI DOMINICANA</div>
                <div className="ml-s">Gestión Profesional</div>
              </div>
            </div>

            {/* Card */}
            <div className="fc">
              <div className="fc-eyebrow">🔐 Acceso Seguro</div>
              <div className="fc-title">Iniciar Sesión</div>
              <div className="fc-desc">Ingresa tus credenciales para continuar al sistema</div>
              <div className="fc-div" />

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="field-lbl" htmlFor="email">
                    <span>👤</span> Usuario / Email
                  </label>
                  <input
                    id="email"
                    type="text"
                    className="field-inp"
                    placeholder="admin@farmacia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label className="field-lbl" htmlFor="password">
                    <span>🔑</span> Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="field-inp"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="err">
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span className="err-txt">{error}</span>
                  </div>
                )}

                <button id="btn-login" type="submit" className="btn-go" disabled={loading}>
                  {loading ? (
                    <><div className="spin" /> Verificando...</>
                  ) : (
                    <>→ &nbsp;Ingresar al Sistema</>
                  )}
                </button>
              </form>
            </div>

            <p className="ftr">
              FARMACIA ARCHI DOMINICANA © {new Date().getFullYear()} —{" "}
              <span>FarmaSystem PRO</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
