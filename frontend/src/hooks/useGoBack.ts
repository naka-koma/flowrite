import { useNavigate } from "react-router-dom";

// react-router（history パッケージ）は履歴エントリごとに history.state.idx を採番する。
// 最初のエントリ（idx===0、または未設定）でnavigate(-1)すると、アプリの外
// （GAS WebAppを開く前のページ）まで戻ってしまうため、その場合はfallbackPathへ遷移する
function hasInAppHistory(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === "number" && state.idx > 0;
}

// ブラウザの「戻る」相当の遷移を行う。ハッシュを直接指定して開かれた場合など
// アプリ内の履歴が無いときはfallbackPathへ遷移する
export function useGoBack(fallbackPath: string) {
  const navigate = useNavigate();

  return () => {
    if (hasInAppHistory()) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
