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

    // 1. 构造Prompt
    const prompt = `你是专业的个人消费结构评估师，请根据用户提供的月度收入和消费明细，按照以下规则评估其消费结构合理性：
1. 分类映射：将所有消费对应到[必需生活/自我提升/休闲娱乐/储蓄投资/杂项其他]五个分类，相同分类自动合并金额
2. 计算每个分类占总收入的比例，对照"必需生活40%-60%、自我提升10%-20%、休闲娱乐5%-15%、储蓄投资15%-30%、杂项0%-10%"的合理区间打分，每个分类满分100，在区间内得满分，每偏离10%扣10分
3. 按照权重（必需生活30%、储蓄投资25%、自我提升20%、休闲娱乐15%、杂项10%）计算总分，给出最终等级（80-100非常合理/60-79基本合理/40-59不太合理/0-39不合理）
4. 针对超出合理区间的分类给出1-2条具体优化建议
请严格按照JSON格式返回结果，不要输出额外内容，格式如下：
{
  "total_score": 得分数字,
  "level": "等级文本",
  "category_details": [{"name": "分类名", "percent": 占比数字, "score": 分类得分}],
  "suggestions": ["建议1", "建议2"]
}
用户数据：月度收入${monthly_income}元，消费明细：${JSON.stringify(expense_list)}
`;

    // 2. 调用通义千问API
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
