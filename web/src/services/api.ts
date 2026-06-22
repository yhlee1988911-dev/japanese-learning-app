// 生产环境使用相对路径（通过 Netlify redirect 代理到 Functions）
// 开发环境使用本地后端地址
export const API_URL = process.env.REACT_APP_API_URL || '/api';
