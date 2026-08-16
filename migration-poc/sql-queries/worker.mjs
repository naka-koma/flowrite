// このPoCでは wrangler d1 execute --local をCLIから直接叩いて検証するため、
// このWorker自体は使わない（wrangler.tomlのmain解決のためのプレースホルダー）
export default {
  async fetch() {
    return new Response("poc-sql-queries placeholder");
  },
};
