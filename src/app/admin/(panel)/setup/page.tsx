import { SetupPanel } from "./setup-panel";

export const metadata = { title: "初期設定・テスト" };

export default function SetupPage() {
  return (
    <>
      <h1 className="text-[22px] font-bold">初期設定・テスト</h1>
      <p className="mt-1 text-[13px] text-muted">環境変数の確認、スプレッドシートの初期設定、動作テストを行います。</p>
      <SetupPanel />
    </>
  );
}
