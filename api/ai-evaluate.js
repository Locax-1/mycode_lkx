// 通义千问API调用示例，如果用OpenAI只需要改endpoint和请求格式
const { Configuration, OpenAIApi } = require("openai");

// 从环境变量读取API Key
const configuration = new Configuration({
  apiKey: process.env.DASHSCOPE_API_KEY,
  basePath: "https://dashscope.aliyuncs.com/v1/openai",
});
const openai = new OpenAIApi(configuration);

// 允许跨域访问
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Content-Type"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// 接口主逻辑
const handler = allowCors(async (req, res) => {
  try {
    const { monthly_income, expense_list } = req.body;
    const completion = await openai.createChatCompletion({
      model: "qwen-turbo",
      messages: [{role: "user", content: prompt}],
      temperature: 0.1, // 低随机性，保证输出稳定
    });

    // 3. 解析返回结果
    const aiResponse = completion.data.choices[0].message.content;
    // 清理可能返回的markdown格式
    const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson);

    // 4. 返回给前端
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "AI评估失败，请稍后重试"});
  }
});

module.exports = handler;
