import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "starbucks-egift-gifts";

const STARBUCKS_GREEN = "#00704A";
const DARK_GREEN = "#1E3932";
const CREAM = "#F2F0EB";
const GOLD = "#CBA258";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function btnStyle(bg, color, extra = {}) {
  return {
    background: bg, color, border: "none", borderRadius: 8,
    padding: "8px 14px", fontSize: 13, cursor: "pointer",
    fontFamily: "sans-serif", fontWeight: 600, ...extra,
  };
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1.5px solid #ddd", borderRadius: 10,
  padding: "11px 14px", fontSize: 15, fontFamily: "sans-serif",
  outline: "none", color: "#1E3932", background: "#fff",
};

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontFamily: "sans-serif", color: "#666", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

// ── URLプレビュー＆ステータス確認モーダル ──────────────────
function UrlCheckModal({ url, onConfirm, onCancel }) {
  const [status, setStatus] = useState(null); // null | "unused" | "used"

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "stretch",
    }}>
      {/* 上部：ステータス確認UI */}
      <div style={{
        background: DARK_GREEN, padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 15 }}>
          📋 ギフトの状態を確認してください
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif", fontSize: 12 }}>
          下のページでギフトの使用状況を確認し、状態を選んでください
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setStatus("unused")}
            style={{
              flex: 1, padding: "10px 0", border: `2px solid ${status === "unused" ? GOLD : "rgba(255,255,255,0.3)"}`,
              borderRadius: 10, background: status === "unused" ? GOLD : "transparent",
              color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            ✅ 未使用
          </button>
          <button
            onClick={() => setStatus("used")}
            style={{
              flex: 1, padding: "10px 0", border: `2px solid ${status === "used" ? "#e74c3c" : "rgba(255,255,255,0.3)"}`,
              borderRadius: 10, background: status === "used" ? "#e74c3c" : "transparent",
              color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            ✗ 使用済み
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ ...btnStyle("rgba(255,255,255,0.15)", "#fff"), flex: 1, padding: "10px 0", fontSize: 14 }}
          >
            キャンセル
          </button>
          <button
            onClick={() => status && onConfirm(status === "used")}
            style={{
              flex: 2, padding: "10px 0", border: "none", borderRadius: 8,
              background: status ? STARBUCKS_GREEN : "#555",
              color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 14,
              cursor: status ? "pointer" : "default", opacity: status ? 1 : 0.5,
            }}
          >
            この状態で登録する
          </button>
        </div>
      </div>

      {/* 下部：iframeプレビュー */}
      <div style={{ flex: 1, position: "relative" }}>
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="ギフトページプレビュー"
        />
        {/* iframeがブロックされる場合の案内 */}
        <div style={{
          position: "absolute", bottom: 12, left: 0, right: 0,
          display: "flex", justifyContent: "center", pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 20,
            padding: "6px 16px", fontSize: 12, fontFamily: "sans-serif",
            pointerEvents: "auto",
          }}>
            表示されない場合は{" "}
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ color: GOLD, fontWeight: 700 }}>
              別タブで開く ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────
export default function App() {
  const [gifts, setGifts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
  }, [gifts]);
  const [tab, setTab] = useState("unused");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", expiry: "", note: "", giftUrl: "" });
  const [editId, setEditId] = useState(null);
  // URL確認モーダル用
  const [checkingUrl, setCheckingUrl] = useState(null); // { url, pendingGift }

  const unused = gifts.filter((g) => !g.used);
  const used = gifts.filter((g) => g.used);
  const totalUnused = unused.reduce((s, g) => s + (Number(g.amount) || 0), 0);

  function resetForm() {
    setForm({ name: "", amount: "", expiry: "", note: "", giftUrl: "" });
    setEditId(null);
  }

  function handleAdd() {
    if (!form.name && !form.giftUrl) return;
    const pendingGift = {
      ...form,
      id: editId !== null ? editId : Date.now(),
      addedAt: new Date().toISOString(),
    };

    if (form.giftUrl) {
      // URLがある → プレビューモーダルを開く
      setShowForm(false);
      setCheckingUrl({ url: form.giftUrl, pendingGift, isEdit: editId !== null });
    } else {
      // URLなし → そのまま未使用で登録
      if (editId !== null) {
        setGifts(gifts.map((g) => (g.id === editId ? { ...g, ...form } : g)));
      } else {
        setGifts([...gifts, { ...pendingGift, used: false }]);
      }
      resetForm();
      setShowForm(false);
    }
  }

  function handleUrlConfirm(isUsed) {
    const { pendingGift, isEdit } = checkingUrl;
    const finalGift = {
      ...pendingGift,
      used: isUsed,
      usedAt: isUsed ? new Date().toISOString() : undefined,
    };
    if (isEdit) {
      setGifts(gifts.map((g) => (g.id === pendingGift.id ? finalGift : g)));
    } else {
      setGifts([...gifts, finalGift]);
    }
    setCheckingUrl(null);
    resetForm();
    if (isUsed) setTab("used");
  }

  function markUsed(id) {
    setGifts(gifts.map((g) => (g.id === id ? { ...g, used: true, usedAt: new Date().toISOString() } : g)));
  }
  function markUnused(id) {
    setGifts(gifts.map((g) => (g.id === id ? { ...g, used: false, usedAt: undefined } : g)));
  }
  function deleteGift(id) {
    setGifts(gifts.filter((g) => g.id !== id));
  }
  function startEdit(g) {
    setForm({ name: g.name, amount: g.amount, expiry: g.expiry, note: g.note, giftUrl: g.giftUrl || "" });
    setEditId(g.id);
    setShowForm(true);
  }
  // カードからURLプレビューを開く（使用済み確認用）
  function openUrlCheck(g) {
    setCheckingUrl({ url: g.giftUrl, pendingGift: g, isEdit: true });
  }

  const list = tab === "unused" ? unused : used;

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Georgia', serif", color: DARK_GREEN }}>
      {/* Header */}
      <div style={{ background: DARK_GREEN, padding: "28px 24px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>☕</span>
            <div>
              <div style={{ color: GOLD, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "sans-serif" }}>Starbucks</div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>eギフト管理</div>
            </div>
          </div>
          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 24 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "sans-serif" }}>未使用件数</div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: "bold" }}>{unused.length}<span style={{ fontSize: 13, marginLeft: 2 }}>件</span></div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 24 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "sans-serif" }}>合計金額</div>
              <div style={{ color: GOLD, fontSize: 22, fontWeight: "bold" }}>¥{totalUnused.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 24 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "sans-serif" }}>使用済み</div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: "bold" }}>{used.length}<span style={{ fontSize: 13, marginLeft: 2 }}>件</span></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 20, borderRadius: 10, overflow: "hidden", border: `2px solid ${DARK_GREEN}` }}>
          {["unused", "used"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
              fontFamily: "sans-serif", fontWeight: 600, fontSize: 14,
              background: tab === t ? DARK_GREEN : "transparent",
              color: tab === t ? "#fff" : DARK_GREEN,
              transition: "all 0.2s",
            }}>
              {t === "unused" ? `未使用 (${unused.length})` : `使用済み (${used.length})`}
            </button>
          ))}
        </div>

        {/* Gift list */}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {list.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#999", fontFamily: "sans-serif", fontSize: 14 }}>
              {tab === "unused" ? "未使用のeギフトはありません" : "使用済みのeギフトはありません"}
            </div>
          )}
          {list.map((g) => {
            const days = daysLeft(g.expiry);
            const urgent = days !== null && days <= 7 && !g.used;
            return (
              <div key={g.id} style={{
                background: "#fff", borderRadius: 14, padding: "16px",
                boxShadow: urgent ? "0 0 0 2px #e74c3c" : "0 2px 8px rgba(0,0,0,0.07)",
                opacity: g.used ? 0.65 : 1, position: "relative",
              }}>
                {urgent && (
                  <div style={{ position: "absolute", top: 12, right: 12, background: "#e74c3c", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontFamily: "sans-serif", fontWeight: 700 }}>
                    残り{days}日
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: g.used ? "#eee" : STARBUCKS_GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    ☕
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 2 }}>{g.name || "スタバeギフト"}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      {g.amount && <span style={{ color: STARBUCKS_GREEN, fontWeight: 700, fontFamily: "sans-serif", fontSize: 15 }}>¥{Number(g.amount).toLocaleString()}</span>}
                      {g.expiry && <span style={{ color: urgent ? "#e74c3c" : "#888", fontSize: 12, fontFamily: "sans-serif" }}>有効期限: {formatDate(g.expiry)}</span>}
                    </div>
                    {g.note && <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontFamily: "sans-serif" }}>{g.note}</div>}
                    {g.used && g.usedAt && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, fontFamily: "sans-serif" }}>使用日: {formatDate(g.usedAt)}</div>}

                    {/* ギフトURLボタン */}
                    {g.giftUrl && !g.used && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={() => openUrlCheck(g)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: GOLD, color: "#fff", border: "none",
                            borderRadius: 8, padding: "8px 16px",
                            fontSize: 13, fontWeight: 700, fontFamily: "sans-serif", cursor: "pointer",
                          }}
                        >
                          🔗 ギフトページを確認する
                        </button>
                      </div>
                    )}
                    {g.giftUrl && g.used && (
                      <div style={{ marginTop: 8 }}>
                        <a href={g.giftUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#aaa", fontFamily: "sans-serif" }}>
                          リンクを開く ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {!g.used && (
                    <>
                      <button onClick={() => markUsed(g.id)} style={btnStyle(STARBUCKS_GREEN, "#fff")}>✓ 使用済みにする</button>
                      <button onClick={() => startEdit(g)} style={btnStyle("#f5f5f5", DARK_GREEN)}>編集</button>
                    </>
                  )}
                  {g.used && <button onClick={() => markUnused(g.id)} style={btnStyle("#f5f5f5", DARK_GREEN)}>↩ 未使用に戻す</button>}
                  <button onClick={() => deleteGift(g.id)} style={btnStyle("#fff0f0", "#c0392b")}>削除</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        style={{
          position: "fixed", bottom: 24, right: 24,
          background: STARBUCKS_GREEN, color: "#fff",
          border: "none", borderRadius: "50%", width: 60, height: 60,
          fontSize: 30, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
        }}
      >+</button>

      {/* Add / Edit Modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 30, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}
        >
          <div style={{
            background: "#fff", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 40px", width: "100%", maxWidth: 480,
            margin: "0 auto", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 20, color: DARK_GREEN }}>
              {editId !== null ? "ギフトを編集" : "eギフトを追加"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="ギフト名（送り主など）">
                <input placeholder="例: 田中さんから" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="金額（円）">
                <input type="number" placeholder="例: 500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="有効期限">
                <input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="メモ">
                <input placeholder="例: モバイルオーダー限定" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="🔗 eギフトURL">
                <input
                  placeholder="https://gift.line.me/..."
                  value={form.giftUrl}
                  onChange={(e) => setForm({ ...form, giftUrl: e.target.value })}
                  style={inputStyle}
                />
                {form.giftUrl && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4, fontFamily: "sans-serif" }}>
                    ※ 登録時にページが開き、使用状況を確認できます
                  </div>
                )}
              </Field>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ ...btnStyle("#f5f5f5", DARK_GREEN), flex: 1, padding: "14px 0", fontSize: 15 }}>キャンセル</button>
              <button onClick={handleAdd} style={{ ...btnStyle(STARBUCKS_GREEN, "#fff"), flex: 2, padding: "14px 0", fontSize: 15, fontWeight: "bold" }}>
                {form.giftUrl ? "確認して登録 →" : (editId !== null ? "保存する" : "追加する")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URLプレビュー＆ステータス確認モーダル */}
      {checkingUrl && (
        <UrlCheckModal
          url={checkingUrl.url}
          onConfirm={handleUrlConfirm}
          onCancel={() => { setCheckingUrl(null); setShowForm(true); }}
        />
      )}
    </div>
  );
}
