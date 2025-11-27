import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

function FreeTrialModal({ onClose }: Props) {
  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: #111418;
          border: 2px solid #00ffa3;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          position: relative;
          box-shadow: 0 0 60px rgba(0, 255, 163, 0.4);
          animation: scaleIn 0.3s ease;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e5e5e5;
        }

        .modal-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, #00ffa3 0%, #00cc82 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          box-shadow: 0 0 30px rgba(0, 255, 163, 0.4);
        }

        .modal-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .modal-text {
          font-size: 16px;
          color: #9ca3af;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .modal-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .primary-btn {
          background: linear-gradient(135deg, #00ffa3 0%, #00cc82 100%);
          color: #0d0f11;
          border: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          text-align: center;
          box-shadow: 0 0 25px rgba(0, 255, 163, 0.4);
        }

        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 35px rgba(0, 255, 163, 0.6);
        }

        .secondary-btn {
          background: transparent;
          color: #00ffa3;
          border: 1px solid #00ffa3;
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          text-align: center;
        }

        .secondary-btn:hover {
          background: rgba(0, 255, 163, 0.1);
        }

        .feature-list {
          background: rgba(0, 255, 163, 0.05);
          border: 1px solid rgba(0, 255, 163, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #e5e5e5;
          margin-bottom: 12px;
        }

        .feature-item:last-child {
          margin-bottom: 0;
        }

        .feature-check {
          color: #00ffa3;
          font-size: 18px;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .modal-content {
            padding: 32px 24px;
          }

          .modal-title {
            font-size: 24px;
          }

          .modal-text {
            font-size: 15px;
          }
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>

          <div className="modal-icon">🚀</div>

          <h2 className="modal-title">
            Unlock Unlimited SQL Analysis
          </h2>

          <p className="modal-text">
            You've used your free analysis! Create a free account to get unlimited query optimizations, save your analysis history, and more.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Unlimited query analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Save analysis history</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Advanced optimization insights</span>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <span>Export reports</span>
            </div>
          </div>

          <div className="modal-buttons">
            <a href="/signup" className="primary-btn">
              Create Free Account
            </a>
            <a href="/login" className="secondary-btn">
              Log In
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default FreeTrialModal;
