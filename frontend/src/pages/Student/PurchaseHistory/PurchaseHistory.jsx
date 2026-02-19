import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { API_BASE } from '../../../utils/apiBase';
import './PurchaseHistory.css';

// In-memory cache to avoid regeneration across navigations
let __purchaseCache = {
  items: [],
  total: 0,
  nextCursor: null,
  filters: { q: '', status: 'all', from: '', to: '' },
  hydrated: false,
  ts: 0,
};

const CACHE_KEY = 'purchaseHistory:v1';

const formatINR = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    // Fallback to INR if unsupported
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }
};

const toDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusClass = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'paid': return 'ph-pill ph-paid';
    case 'success': return 'ph-pill ph-paid';
    case 'captured': return 'ph-pill ph-paid';
    case 'refunded': return 'ph-pill ph-refunded';
    case 'failed': return 'ph-pill ph-failed';
    default: return 'ph-pill';
  }
};

const isPaidLike = (s) => {
  const v = (s || '').toLowerCase();
  return v === 'paid' || v === 'success' || v === 'captured';
};

const safeId = (x) => x?._id || x?.id || x?.receiptId || x?.paymentId || x?.orderId || x?.razorpay_payment_id || x?.razorpayOrderId;

const normalizeApiBase = (rawBase) => {
  let b = (rawBase || '').trim();
  if (!b) return '';

  // remove trailing slash
  b = b.replace(/\/+$/, '');

  // If base ends with "/api" but not "/api/vX", upgrade to "/api/v1"
  // Examples:
  //   https://domain.com/api -> https://domain.com/api/v1
  //   /api -> /api/v1
  if (/\/api$/i.test(b) && !/\/api\/v\d+$/i.test(b)) {
    b = `${b}/v1`;
  }

  return b;
};

const buildBaseCandidates = (base) => {
  const list = [];
  const b = normalizeApiBase(base);

  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin.replace(/\/+$/, '') : '';

  // Primary first
  if (b) list.push(b);

  // If base is /api (or contains /api) but still not v1, also try /api/v1 version
  if (base) {
    const raw = String(base).replace(/\/+$/, '');
    if (/\/api$/i.test(raw)) list.push(`${raw}/v1`);
    if (/\/api\/v\d+$/i.test(raw)) list.push(raw);
  }

  // Also try origin-based fallbacks (very common in prod)
  if (origin) {
    list.push(`${origin}/api/v1`);
    list.push(`${origin}/api`);
  }

  // Deduplicate
  return Array.from(new Set(list.map(x => x.replace(/\/+$/, ''))));
};

const ensureSlash = (p) => (p.startsWith('/') ? p : `/${p}`);

const saveAs = (blob, fileName) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
};

const openInNewTab = (blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 15000);
};

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState(__purchaseCache.items);
  const [total, setTotal] = useState(__purchaseCache.total);
  const [nextCursor, setNextCursor] = useState(__purchaseCache.nextCursor);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(__purchaseCache.filters);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipNote, setSlipNote] = useState('');

  // Resolve base once; util already logs once
  const Base = useMemo(() => normalizeApiBase(API_BASE), []);
  const baseCandidates = useMemo(() => buildBaseCandidates(API_BASE), [Base]);

  // Rehydrate from sessionStorage immediately on first paint
  useEffect(() => {
    if (!__purchaseCache.hydrated) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setItems(parsed.items || []);
          setTotal(parsed.total || 0);
          setNextCursor(parsed.nextCursor || null);
          setFilters(parsed.filters || filters);
          __purchaseCache = { ...__purchaseCache, ...parsed, hydrated: true };
        } else {
          __purchaseCache.hydrated = true;
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCache = (data) => {
    __purchaseCache = { ...__purchaseCache, ...data, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      items: __purchaseCache.items,
      total: __purchaseCache.total,
      nextCursor: __purchaseCache.nextCursor,
      filters: __purchaseCache.filters,
    }));
  };

  const mergeDedupe = (prev, incoming) => {
    const map = new Map(prev.map(p => [safeId(p), p]).filter(([k]) => k));
    for (const it of incoming) {
      const k = safeId(it);
      if (!k) continue;
      map.set(k, { ...(map.get(k) || {}), ...it });
    }
    return Array.from(map.values());
  };

  const normalizeHistoryPayload = (data) => {
    // Handle multiple backend shapes safely
    // common: { items, total, nextCursor }
    // also possible: { receipts: [] } or { data: [] } or [] directly
    const arr =
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.receipts) && data.receipts) ||
      (Array.isArray(data?.purchases) && data.purchases) ||
      (Array.isArray(data?.data) && data.data) ||
      (Array.isArray(data) && data) ||
      [];

    const next = data?.nextCursor || data?.next || data?.cursor || null;
    const tot =
      (typeof data?.total === 'number' && data.total) ||
      (typeof data?.count === 'number' && data.count) ||
      (typeof data?.totalCount === 'number' && data.totalCount) ||
      null;

    return { arr, next, tot };
  };

  const tokenFromStorage = () => localStorage.getItem('authToken') || localStorage.getItem('token') || '';

  const tryGetJson = async (pathWithQuery, config = {}) => {
    const token = tokenFromStorage();
    let lastErr = null;

    for (const b of baseCandidates) {
      try {
        const url = `${b}${ensureSlash(pathWithQuery)}`;
        const res = await axios.get(url, {
          ...config,
          headers: { ...(config.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        return res;
      } catch (e) {
        lastErr = e;
        const status = e?.response?.status;
        // If unauthorized, stop early
        if (status === 401) throw e;
        // For 404/502 etc, continue to next candidate
        continue;
      }
    }

    throw lastErr || new Error('Request failed');
  };

  const tryGetBlob = async (paths, config = {}) => {
    const token = tokenFromStorage();
    let lastErr = null;

    for (const p of paths) {
      for (const b of baseCandidates) {
        try {
          const url = p.startsWith('http') ? p : `${b}${ensureSlash(p)}`;
          const res = await axios.get(url, {
            ...config,
            responseType: 'blob',
            headers: { ...(config.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          return { res, usedUrl: url };
        } catch (e) {
          lastErr = e;
          const status = e?.response?.status;
          if (status === 401) throw e;
          continue;
        }
      }
    }

    throw lastErr || new Error('Download failed');
  };

  const inflight = useRef(null);
  const fetchPage = async ({ cursor = '', append = false } = {}) => {
    setLoading(true);
    setBanner('');
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.from) params.set('dateFrom', filters.from);
      if (filters.to) params.set('dateTo', filters.to);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '50'); // increased so "Receipts" me sab aa jaye easily

      // Try multiple likely history endpoints (prod mismatch fix)
      const candidates = [
        `/payments/history?${params.toString()}`,
        `/user/receipts?${params.toString()}`,
        `/user/receipt/history?${params.toString()}`,
        `/user/purchases?${params.toString()}`,
      ];

      let data = null;

      // Run candidate endpoints until one works
      for (const path of candidates) {
        try {
          inflight.current = tryGetJson(path);
          const r = await inflight.current;
          data = r.data;
          if (data) break;
        } catch (e) {
          // if unauthorized, go login
          if (axios.isAxiosError(e) && e.response?.status === 401) {
            navigate('/Login');
            return;
          }
          // try next endpoint
          continue;
        }
      }

      if (!data) throw new Error('No data from server');

      const { arr, next, tot } = normalizeHistoryPayload(data);
      const incoming = Array.isArray(arr) ? arr : [];
      const nextC = next || null;

      const merged = append ? mergeDedupe(items, incoming) : incoming;
      const totalVal = (typeof tot === 'number') ? tot : (append ? total : merged.length);

      setItems(merged);
      setTotal(totalVal);
      setNextCursor(nextC);

      saveCache({ items: merged, total: totalVal, nextCursor: nextC, filters });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/Login');
        return;
      }
      const hasCache = (__purchaseCache.items || []).length > 0;
      if (hasCache) setBanner('Server unreachable — showing cached purchases');
      else setBanner('Failed to load purchases/receipts from server.');
    } finally {
      setLoading(false);
      inflight.current = null;
    }
  };

  // Initial background refresh after rehydrate
  useEffect(() => {
    fetchPage({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced filter fetch
  const debounceRef = useRef(null);
  useEffect(() => {
    saveCache({ filters });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage({ append: false });
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.from, filters.to, filters.status]);

  const onLoadMore = () => {
    if (nextCursor && !loading) fetchPage({ cursor: nextCursor, append: true });
  };

  const openDrawer = (row) => { setSelected(row); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);

  const onDownload = async (row, type = 'invoice', format = 'pdf') => {
    try {
      const id = safeId(row);
      if (!id) {
        alert('Invalid receipt id');
        return;
      }

      if (type === 'invoice') {
        const token = tokenFromStorage();
        const invoiceUrl = `/api/invoices/download/${id}?token=${encodeURIComponent(token)}`;
        window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const fmt = (format || 'pdf').toLowerCase();
      const paths = [
        `/user/receipt/${id}/download?format=${fmt}`,
        `/user/receipts/${id}/download?format=${fmt}`,
        `/payments/receipt/${id}/${fmt}`,
        `/payments/receipt/${id}/download?format=${fmt}`,
        `/receipt/${id}/download?format=${fmt}`,
      ];

      const { res } = await tryGetBlob(paths);
      const blob = res.data;

      if (blob?.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          if (json.url) {
            window.open(json.url, '_blank', 'noopener,noreferrer');
            return;
          }
          if (json.message) {
            alert(json.message);
            return;
          }
        } catch {
        }
      }

      const receiptNo = row.receiptNo || row.receiptNumber || id;

      if (String(format).toLowerCase() === 'html') {
        openInNewTab(new Blob([blob], { type: 'text/html' }));
        return;
      }

      if (String(format).toLowerCase() === 'txt') {
        saveAs(new Blob([blob], { type: 'text/plain' }), `Receipt-${receiptNo}.txt`);
        return;
      }

      saveAs(new Blob([blob], { type: 'application/pdf' }), `Receipt-${receiptNo}.pdf`);
    } catch (e) {
      console.error('Download error:', e);
      alert('Failed to download. Please try again.');
    }
  };

  // Derived totals for info cards
  const summary = useMemo(() => {
    const paid = items.filter(x => isPaidLike(x.status));
    const spentPaise = paid.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const spent = spentPaise / 100;
    const last = paid.length ? paid.map(x => +new Date(x.paidAt || x.createdAt)).sort((a,b)=>b-a)[0] : 0;
    return { totalSpent: spent, orders: items.length, lastPurchase: last ? new Date(last) : null };
  }, [items]);

  // Receipts table data (paid-like only)
  const receiptRows = useMemo(() => {
    return (items || []).filter(x => isPaidLike(x.status));
  }, [items]);

  return (
    <div className="ph-wrapper">
      {banner && (
        <div className="ph-banner" role="status">{banner}</div>
      )}

      <header className="ph-header">
        <h1 className="ph-title">Purchase History</h1>
        <p className="ph-subtitle">View your course purchases and download receipts</p>
      </header>

      <section className="ph-cards">
        <div className="ph-card">
          <span className="ph-card-label">Total Spent</span>
          <strong className="ph-card-value">{formatINR(summary.totalSpent, (items[0]?.currency) || 'INR')}</strong>
        </div>
        <div className="ph-card">
          <span className="ph-card-label">Orders</span>
          <strong className="ph-card-value">{summary.orders}</strong>
        </div>
        <div className="ph-card">
          <span className="ph-card-label">Last Purchase</span>
          <strong className="ph-card-value">{summary.lastPurchase ? toDate(summary.lastPurchase) : '—'}</strong>
        </div>
      </section>

      <section className="ph-filters">
        <div className="ph-input">
          <input
            value={filters.q}
            onChange={(e) => setFilters(v => ({ ...v, q: e.target.value }))}
            placeholder="Search (course/receipt)"
            aria-label="Search (course/receipt)"
          />
        </div>
        <div className="ph-input">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters(v => ({ ...v, from: e.target.value }))}
            placeholder="From"
            aria-label="Date From"
          />
        </div>
        <div className="ph-input">
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters(v => ({ ...v, to: e.target.value }))}
            placeholder="To"
            aria-label="Date To"
          />
        </div>
        <div className="ph-input">
          <select
            value={filters.status}
            onChange={(e) => setFilters(v => ({ ...v, status: e.target.value }))}
            aria-label="Status"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button className="ph-clear" onClick={() => setFilters({ q: '', status: 'all', from: '', to: '' })}>Clear Filters</button>
      </section>

      {/* EXISTING TABLE (unchanged structure) */}
      <section className="ph-table-wrap">
        <table className="ph-table">
          <thead>
            <tr>
              <th>Receipt No.</th>
              <th>Course</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Downloads</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="ph-skel-row">
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel sm" /></td>
                <td><div className="ph-skel sm" /></td>
                <td><div className="ph-skel sm" /></td>
              </tr>
            ))}

            {items.map((row) => (
              <tr key={safeId(row) || row._id}>
                <td>{row.receiptNo || row.receiptNumber || '—'}</td>
                <td>{row.courseTitle || row.courseId?.name || '—'}</td>
                <td>{toDate(row.paidAt || row.createdAt)}</td>
                <td>{formatINR(Number(row.amount || 0) / 100, row.currency || 'INR')}</td>
                <td>{row.method || row.paymentMethod || '—'}</td>
                <td><span className={statusClass(row.status)}>{(row.status || '').toString()}</span></td>
                <td>
                  {isPaidLike(row.status) ? (
                    <button className="ph-link" onClick={() => onDownload(row, 'invoice')}>Tax Invoice</button>
                  ) : (
                    <span className="ph-muted">—</span>
                  )}
                </td>
                <td>
                  <button className="ph-view" onClick={() => openDrawer(row)}>View</button>
                </td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="ph-empty">
                    <div className="ph-empty-illustration" aria-hidden="true">🧾</div>
                    <h3>No purchases yet</h3>
                    <p>Your orders will appear here once you purchase a course.</p>
                    <button className="ph-browse" onClick={() => navigate('/student/my-courses')}>Browse Courses</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="ph-pagination">
        <div className="ph-total">Total: {total}</div>
        {nextCursor && (
          <button className="ph-load-more" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {/* ✅ NEW: Receipts section (Dashboard-style) */}
      <section className="ph-table-wrap" style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 12px 0' }}>Receipts</h2>
        <table className="ph-table">
          <thead>
            <tr>
              <th>Receipt No.</th>
              <th>Course</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Downloads</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && receiptRows.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <tr key={`rsk-${i}`} className="ph-skel-row">
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel" /></td>
                <td><div className="ph-skel sm" /></td>
                <td><div className="ph-skel sm" /></td>
              </tr>
            ))}

            {receiptRows.map((row) => (
              <tr key={`rc-${safeId(row) || row._id}`}>
                <td>{row.receiptNo || row.receiptNumber || '—'}</td>
                <td>{row.courseTitle || row.courseId?.name || '—'}</td>
                <td>{toDate(row.paidAt || row.createdAt)}</td>
                <td>{formatINR(Number(row.amount || 0) / 100, row.currency || 'INR')}</td>
                <td>{typeof row.downloads === 'object' ? (row.downloadCount || 0) : (row.downloads || row.downloadCount || row.downloaded || 0)}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="ph-view" onClick={() => onDownload(row, 'receipt', 'pdf')}>PDF</button>
                  <button className="ph-view" onClick={() => onDownload(row, 'receipt', 'html')}>View</button>
                  <button className="ph-view" onClick={() => onDownload(row, 'receipt', 'txt')}>TXT</button>
                </td>
              </tr>
            ))}

            {!loading && receiptRows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="ph-empty" style={{ padding: 18 }}>
                    <h3 style={{ marginTop: 0 }}>No receipts found</h3>
                    <p style={{ marginBottom: 0 }}>Paid receipts will appear here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Right Drawer - rendered once (fixed tree) */}
      <div className={`ph-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="ph-drawer-header">
          <h3>Order Details</h3>
          <button className="ph-close" onClick={closeDrawer}>×</button>
        </div>
        <div className="ph-drawer-body">
          {selected ? (
            <div className="ph-detail-grid">
              <div className="ph-detail-row"><span className="ph-k">Receipt No.</span><span className="ph-v">{selected.receiptNo || selected.receiptNumber || '—'}</span></div>
              <div className="ph-detail-row"><span className="ph-k">Course</span><span className="ph-v">{selected.courseTitle || selected.courseId?.name || '—'}</span></div>
              <div className="ph-detail-row"><span className="ph-k">Date</span><span className="ph-v">{toDate(selected.paidAt || selected.createdAt)}</span></div>
              <div className="ph-detail-row"><span className="ph-k">Amount</span><span className="ph-v">{formatINR(Number(selected.amount || 0) / 100, selected.currency || 'INR')}</span></div>
              <div className="ph-detail-row"><span className="ph-k">Method</span><span className="ph-v">{selected.method || selected.paymentMethod || '—'}</span></div>
              <div className="ph-detail-row"><span className="ph-k">Status</span><span className="ph-v"><span className={statusClass(selected.status)}>{selected.status}</span></span></div>
              {selected.tax && (
                <div className="ph-detail-row"><span className="ph-k">Tax</span><span className="ph-v">{formatINR(Number(selected.tax.total || 0), selected.currency || 'INR')}</span></div>
              )}
              {selected.discount != null && (
                <div className="ph-detail-row"><span className="ph-k">Discount</span><span className="ph-v">{formatINR(Number(selected.discount || 0), selected.currency || 'INR')}</span></div>
              )}
            </div>
          ) : (
            <div className="ph-placeholder">Select an order to view details</div>
          )}
        </div>
        <div className="ph-drawer-footer">
          <button
            className="ph-download"
            disabled={!selected || !isPaidLike(selected.status)}
            onClick={() => selected && onDownload(selected, 'invoice')}
          >
            Download Tax Invoice
          </button>

          {/* ✅ Added receipt download in drawer too */}
          <button
            className="ph-download"
            disabled={!selected || !isPaidLike(selected.status)}
            onClick={() => selected && onDownload(selected, 'receipt', 'pdf')}
            style={{ marginTop: 8 }}
          >
            Download Receipt (PDF)
          </button>

          {(selected && (selected.status === 'pending_offline' || selected.method === 'offline' || selected.method === 'manual')) && (
            <div className="ph-upload-inline">
              <input type="file" accept="image/*,application/pdf" onChange={(e)=>setSlipFile(e.target.files[0])} />
              <input placeholder="Note (optional)" value={slipNote} onChange={(e)=>setSlipNote(e.target.value)} />
              <button
                className="ph-upload-btn"
                disabled={!slipFile || uploadingSlip}
                onClick={async()=>{
                  if (!selected) return; setUploadingSlip(true);
                  try {
                    const fd = new FormData();
                    fd.append('courseId', selected.courseId || selected.courseId?._id || '');
                    fd.append('amount', String(Math.round((selected.amount||0))));
                    if (slipNote) fd.append('note', slipNote);
                    fd.append('slip', slipFile);

                    const token = tokenFromStorage();

                    // Use baseCandidates to avoid "/api" vs "/api/v1" mismatch
                    let ok = false;
                    let lastErr = null;

                    for (const b of baseCandidates) {
                      try {
                        const resp = await fetch(`${b}/payments/offline/submit`, {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: fd
                        });
                        if (!resp.ok) throw new Error('Upload failed');
                        ok = true;
                        break;
                      } catch (e) { lastErr = e; }
                    }

                    // fallback to relative (kept for dev)
                    if (!ok) {
                      const resp = await fetch('/api/payments/offline/submit', {
                        method: 'POST',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                        body: fd
                      });
                      if (!resp.ok) throw (lastErr || new Error('Upload failed'));
                    }

                    alert('Slip uploaded — pending review');
                    setSlipFile(null); setSlipNote(''); setUploadingSlip(false);
                    fetchPage({ append: false });
                    closeDrawer();
                  } catch (err) {
                    console.error('upload slip error', err);
                    alert('Upload failed');
                    setUploadingSlip(false);
                  }
                }}
              >
                {uploadingSlip ? 'Uploading…' : 'Upload Slip'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer backdrop */}
      <div className={`ph-backdrop ${drawerOpen ? 'show' : ''}`} onClick={closeDrawer} />
    </div>
  );
}
