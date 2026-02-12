/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Monitor,
  Globe,
  Code,
  FileText,
  Sparkles,
  Brain,
  CodeXml,
  Image,
  Languages,
  Pen,
  Telescope,
  Terminal,
  Presentation,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface TemplateCard {
  title: { zh: string; en: string };
  prompt: { zh: string; en: string };
}

export interface SubCategory {
  key: string;
  label: { zh: string; en: string };
  templates: TemplateCard[];
}

export interface ModeConfig {
  key: string;
  icon: LucideIcon;
  systemPrompt: { zh: string; en: string };
  hero: { zh: { title: string; subtitle: string }; en: { title: string; subtitle: string } };
  placeholder: { zh: string; en: string };
  subCategories: SubCategory[];
}

/* ------------------------------------------------------------------ */
/*  Default suggestions (no mode selected)                             */
/* ------------------------------------------------------------------ */
export const DEFAULT_SUGGESTIONS: TemplateCard[] = [
  {
    title: { zh: '界面设计分析', en: 'UI Design Analysis' },
    prompt: { zh: '帮我分析这张截图中的界面设计，评估布局、配色、交互体验等方面', en: 'Analyze the UI design in this screenshot, evaluating layout, colors, and UX' },
  },
  {
    title: { zh: 'Python 爬虫脚本', en: 'Python Web Scraper' },
    prompt: { zh: '写一段 Python 爬虫代码，抓取网页内容并保存为 JSON 格式', en: 'Write a Python web scraper that fetches page content and saves as JSON' },
  },
  {
    title: { zh: '文档核心要点', en: 'Document Summary' },
    prompt: { zh: '帮我总结这篇文档的核心要点，提炼出关键信息和行动建议', en: 'Summarize the key points of this document with actionable insights' },
  },
  {
    title: { zh: '最新 AI 资讯', en: 'Latest AI News' },
    prompt: { zh: '帮我整理最近一周 AI 领域的重要进展和热点新闻', en: 'Compile the latest AI developments and trending news from this week' },
  },
];

export const DEFAULT_ICONS: Record<string, LucideIcon> = {
  '界面设计分析': Monitor,
  'UI Design Analysis': Monitor,
  'Python 爬虫脚本': Code,
  'Python Web Scraper': Code,
  '文档核心要点': FileText,
  'Document Summary': FileText,
  '最新 AI 资讯': Globe,
  'Latest AI News': Globe,
};

/* ------------------------------------------------------------------ */
/*  Mode definitions with sub-categories                               */
/* ------------------------------------------------------------------ */
export const MODES: Record<string, ModeConfig> = {
  /* ======================== 任务助理 ======================== */
  assistant: {
    key: 'assistant',
    icon: Sparkles,
    systemPrompt: {
      zh: '你是一个高效的任务助理。用户会给你布置各种任务，你需要拆解任务、制定计划并给出详细的执行方案。如果任务涉及工具使用、文件处理、数据分析等，请给出具体步骤和代码。回答要结构清晰、可操作性强。',
      en: 'You are an efficient task assistant. The user will assign various tasks. You should break down the task, create a plan, and provide detailed execution steps. If the task involves tool usage, file processing, or data analysis, give concrete steps and code. Answers should be well-structured and actionable.',
    },
    hero: {
      zh: { title: '任务助理', subtitle: '会用工具办事的超级助理' },
      en: { title: 'Task Assistant', subtitle: 'Your super assistant that gets things done' },
    },
    placeholder: { zh: '给我布置一个任务', en: 'Assign me a task' },
    subCategories: [
      {
        key: 'featured',
        label: { zh: '精选案例', en: 'Featured' },
        templates: [
          { title: { zh: '出勤奖金计算', en: 'Attendance Bonus Calc' }, prompt: { zh: '帮我制作一个员工出勤奖金计算表，包含考勤天数、迟到扣款、绩效系数等字段，输出 Excel 格式的计算逻辑', en: 'Create an employee attendance bonus calculator with fields for attendance days, late deductions, performance coefficients, output as Excel logic' } },
          { title: { zh: '品牌相机介绍网页', en: 'Camera Brand Page' }, prompt: { zh: '帮我设计一个品牌相机产品介绍网页，包含产品参数展示、轮播图、购买按钮，要求现代简约风格', en: 'Design a camera brand product page with specs display, carousel, buy button in modern minimal style' } },
          { title: { zh: '名单转表格', en: 'List to Spreadsheet' }, prompt: { zh: '我有一份文字格式的人员名单，帮我转换成结构化的表格，包含姓名、部门、职位、联系方式等列', en: 'Convert a text-format personnel list into a structured spreadsheet with name, department, position, contact columns' } },
          { title: { zh: '会议纪要整理', en: 'Meeting Notes' }, prompt: { zh: '帮我把这份会议录音的文字稿整理成正式的会议纪要，提炼关键决议和待办事项', en: 'Organize meeting transcript into formal minutes with key decisions and action items' } },
          { title: { zh: '数据可视化报表', en: 'Data Visualization' }, prompt: { zh: '根据这份销售数据，帮我生成一份包含图表的可视化分析报告，用 Python matplotlib 实现', en: 'Generate a visual analysis report with charts from this sales data using Python matplotlib' } },
          { title: { zh: '项目排期甘特图', en: 'Gantt Chart' }, prompt: { zh: '帮我根据项目需求制定一份项目排期计划，生成甘特图格式的时间线，标注里程碑节点', en: 'Create a project timeline as a Gantt chart with milestones from these requirements' } },
        ],
      },
      {
        key: 'research',
        label: { zh: '咨询调研', en: 'Research' },
        templates: [
          { title: { zh: '竞品分析报告', en: 'Competitor Analysis' }, prompt: { zh: '帮我做一份竞品分析报告，对比 3-5 个同类产品的功能、定价、用户评价、市场份额', en: 'Create a competitor analysis comparing 3-5 similar products on features, pricing, reviews, and market share' } },
          { title: { zh: '用户调研问卷', en: 'User Survey' }, prompt: { zh: '帮我设计一份用户满意度调研问卷，覆盖产品体验、客服质量、价格感知等维度，包含 15-20 道题', en: 'Design a user satisfaction survey covering product experience, service quality, and price perception, with 15-20 questions' } },
          { title: { zh: '行业趋势分析', en: 'Industry Trends' }, prompt: { zh: '帮我分析当前 AI 行业的发展趋势，包括技术方向、融资动态、政策变化、头部公司布局', en: 'Analyze current AI industry trends including tech directions, funding, policy changes, and major company strategies' } },
          { title: { zh: 'SWOT 分析', en: 'SWOT Analysis' }, prompt: { zh: '帮我对这个产品做 SWOT 分析，从优势、劣势、机会、威胁四个维度展开，并给出战略建议', en: 'Conduct a SWOT analysis for this product from strengths, weaknesses, opportunities, and threats, with strategic recommendations' } },
          { title: { zh: '市场规模测算', en: 'Market Sizing' }, prompt: { zh: '帮我测算国内智能家居市场的规模，使用自上而下和自下而上两种方法，给出 2025-2030 预测', en: 'Estimate the smart home market size using top-down and bottom-up methods with 2025-2030 forecasts' } },
          { title: { zh: '技术选型评估', en: 'Tech Stack Evaluation' }, prompt: { zh: '帮我做一次技术选型评估，对比 React、Vue、Svelte 三个前端框架在大型项目中的适用性', en: 'Evaluate React vs Vue vs Svelte for a large-scale project on performance, ecosystem, and team skills' } },
        ],
      },
      {
        key: 'office',
        label: { zh: 'office 办公', en: 'Office' },
        templates: [
          { title: { zh: '周报自动生成', en: 'Weekly Report' }, prompt: { zh: '根据我这周的工作内容，帮我生成一份格式规范的周报，包含本周完成、下周计划、风险项', en: 'Generate a formatted weekly report with accomplishments, next week plans, and risks from my work notes' } },
          { title: { zh: 'Excel 公式大全', en: 'Excel Formulas' }, prompt: { zh: '帮我写一个 Excel 数据处理方案，包含 VLOOKUP 多表关联、数据透视表设置、条件格式规则', en: 'Create an Excel data processing solution with VLOOKUP cross-referencing, pivot tables, and conditional formatting' } },
          { title: { zh: 'PPT 大纲设计', en: 'PPT Outline' }, prompt: { zh: '帮我设计一份产品季度汇报的 PPT 大纲，包含 15-20 页，每页给出标题和核心内容建议', en: 'Design a quarterly product review PPT outline with 15-20 slides, each with title and key content suggestions' } },
          { title: { zh: '邮件模板库', en: 'Email Templates' }, prompt: { zh: '帮我创建一套常用商务邮件模板，包括会议邀请、项目推进、问题反馈、感谢回复等场景', en: 'Create a business email template collection for meeting invites, project updates, issue reports, and thank-you replies' } },
          { title: { zh: '合同条款审查', en: 'Contract Review' }, prompt: { zh: '帮我审查这份合同的关键条款，标注可能的风险点和需要修改的建议', en: 'Review key clauses in this contract, flag potential risks, and suggest modifications' } },
          { title: { zh: '流程图绘制', en: 'Flowchart Design' }, prompt: { zh: '帮我用 Mermaid 语法画一个审批流程图，包含发起、部门审批、财务审批、CEO审批等环节', en: 'Draw an approval workflow diagram using Mermaid syntax with initiation, dept approval, finance, and CEO stages' } },
        ],
      },
      {
        key: 'appdev',
        label: { zh: '应用开发', en: 'App Dev' },
        templates: [
          { title: { zh: '程序员个人主页', en: 'Developer Portfolio' }, prompt: { zh: '帮我设计并生成一个程序员个人主页，包含个人介绍、技能栈、项目展示、博客链接，使用 HTML/CSS/JS', en: 'Design and generate a developer portfolio site with intro, tech stack, projects, and blog links using HTML/CSS/JS' } },
          { title: { zh: '新年电子贺卡', en: 'Holiday E-Card' }, prompt: { zh: '帮我制作一个精美的新春电子贺卡网页，带动画效果和背景音乐，可以分享给朋友', en: 'Create a beautiful holiday e-card webpage with animations and background music, shareable with friends' } },
          { title: { zh: '抽奖应用设计', en: 'Lottery App' }, prompt: { zh: '帮我设计一个年会抽奖应用，支持导入名单、设置奖项、动画抽取、中奖记录导出', en: 'Design a lottery app for events with name import, prize setup, animated drawing, and winner export' } },
          { title: { zh: '待办清单 App', en: 'Todo List App' }, prompt: { zh: '帮我开发一个待办清单应用，支持添加/编辑/删除任务、优先级标记、完成状态、本地存储', en: 'Build a todo list app with add/edit/delete tasks, priority tags, completion status, and local storage' } },
          { title: { zh: '数学互动网页', en: 'Math Interactive' }, prompt: { zh: '帮我做一个小朋友启蒙数学互动网页，包含加减法练习、趣味动画反馈、进度追踪', en: 'Create an interactive math learning page for kids with addition/subtraction exercises, fun animations, and progress tracking' } },
          { title: { zh: '天气查询小工具', en: 'Weather Widget' }, prompt: { zh: '帮我做一个天气查询小工具网页，输入城市显示实时天气、未来 7 天预报、空气质量指数', en: 'Build a weather widget page with city search, real-time weather, 7-day forecast, and air quality index' } },
        ],
      },
    ],
  },

  /* ======================== 深度思考 ======================== */
  think: {
    key: 'think',
    icon: Brain,
    systemPrompt: {
      zh: '你是一个深度思考助手。面对用户的问题，请进行多角度、深层次的分析。先梳理问题的核心，然后从不同维度展开论述，考虑正反两面观点，最后给出有深度的结论。使用清晰的逻辑结构，必要时引用相关理论或数据支撑。',
      en: 'You are a deep thinking assistant. Analyze the user\'s question from multiple angles and layers. First identify the core issue, then discuss from different dimensions, consider both sides, and provide an insightful conclusion. Use clear logical structure, reference relevant theories or data when necessary.',
    },
    hero: {
      zh: { title: '深度思考', subtitle: '多维分析，深度洞察' },
      en: { title: 'Deep Think', subtitle: 'Multi-dimensional analysis, deep insights' },
    },
    placeholder: { zh: '提出一个需要深度分析的问题', en: 'Ask a question that needs deep analysis' },
    subCategories: [
      {
        key: 'hot',
        label: { zh: '热门话题', en: 'Hot Topics' },
        templates: [
          { title: { zh: 'AI 取代人类工作？', en: 'AI Replacing Jobs?' }, prompt: { zh: '深入分析 AI 是否会大规模取代人类工作岗位，从技术可行性、经济影响、社会结构变化等角度展开', en: 'Deep analysis on whether AI will massively replace human jobs, from technical feasibility, economic impact, and social structure perspectives' } },
          { title: { zh: '远程办公的未来', en: 'Future of Remote Work' }, prompt: { zh: '分析远程办公模式的长期趋势，对比混合办公和全远程的利弊，预测未来 5 年的变化', en: 'Analyze long-term trends of remote work, compare hybrid vs full-remote pros/cons, predict changes in 5 years' } },
          { title: { zh: '新能源汽车格局', en: 'EV Industry Landscape' }, prompt: { zh: '从技术路线、供应链、消费者需求等角度分析新能源汽车行业的竞争格局和未来走向', en: 'Analyze EV industry competition and future direction from tech routes, supply chain, and consumer demand angles' } },
          { title: { zh: '教育改革方向', en: 'Education Reform' }, prompt: { zh: '讨论 AI 时代下教育体系应该如何改革，从课程设计、评价方式、教师角色等方面深入分析', en: 'Discuss how education should reform in the AI era, analyzing curriculum, assessment, and teacher roles' } },
          { title: { zh: '数据隐私与便利', en: 'Privacy vs Convenience' }, prompt: { zh: '深度讨论数据隐私与便利性之间的矛盾，分析各国监管策略的优劣及未来发展方向', en: 'Deep discussion on the tension between data privacy and convenience, comparing regulatory approaches globally' } },
          { title: { zh: '人口结构变化', en: 'Demographic Shifts' }, prompt: { zh: '分析全球人口老龄化和少子化趋势对经济、社会保障、劳动力市场的深远影响', en: 'Analyze the profound impact of global aging and declining birth rates on economy, social security, and labor markets' } },
        ],
      },
      {
        key: 'tech',
        label: { zh: '技术分析', en: 'Tech Analysis' },
        templates: [
          { title: { zh: '微服务 vs 单体', en: 'Microservices vs Monolith' }, prompt: { zh: '从架构复杂度、部署效率、团队协作、运维成本等维度，深入对比微服务和单体架构', en: 'Deep comparison of microservices vs monolith from architecture complexity, deployment, team collaboration, and ops cost' } },
          { title: { zh: 'AI 大模型走向', en: 'LLM Future Direction' }, prompt: { zh: '分析大语言模型的技术发展趋势，包括 scaling law、多模态、端侧部署、Agent 架构等方向', en: 'Analyze LLM tech trends including scaling laws, multimodality, edge deployment, and agent architecture' } },
          { title: { zh: '区块链的真实价值', en: 'Blockchain Real Value' }, prompt: { zh: '客观分析区块链技术的真正价值和局限性，哪些场景是真需求，哪些是伪需求', en: 'Objectively analyze blockchain\'s real value and limitations — which use cases are genuine vs artificial' } },
          { title: { zh: '低代码平台评估', en: 'Low-Code Assessment' }, prompt: { zh: '评估低代码/零代码平台的适用场景与天花板，讨论其对专业开发者的影响', en: 'Assess low-code/no-code platforms\' applicable scenarios and ceiling, discuss impact on professional developers' } },
          { title: { zh: 'Rust 生态展望', en: 'Rust Ecosystem Outlook' }, prompt: { zh: '分析 Rust 语言的发展前景，在系统编程、WebAssembly、嵌入式等领域的竞争力', en: 'Analyze Rust language\'s future in systems programming, WebAssembly, and embedded development' } },
          { title: { zh: '云原生安全挑战', en: 'Cloud-Native Security' }, prompt: { zh: '深入分析云原生架构面临的安全挑战，包括容器逃逸、供应链攻击、零信任实践等', en: 'Deep analysis of cloud-native security challenges including container escape, supply chain attacks, and zero trust' } },
        ],
      },
      {
        key: 'business',
        label: { zh: '商业洞察', en: 'Business' },
        templates: [
          { title: { zh: 'SaaS 商业模式', en: 'SaaS Business Model' }, prompt: { zh: '深入分析 SaaS 商业模式的核心指标（ARR、LTV、CAC），讨论不同阶段的增长策略', en: 'Deep analysis of SaaS business metrics (ARR, LTV, CAC) and growth strategies at different stages' } },
          { title: { zh: '出海策略分析', en: 'Go Global Strategy' }, prompt: { zh: '分析中国科技企业出海的策略选择，从市场选择、本地化、合规、文化适配等维度展开', en: 'Analyze Chinese tech companies\' global expansion strategies: market selection, localization, compliance, culture fit' } },
          { title: { zh: '创业公司估值', en: 'Startup Valuation' }, prompt: { zh: '讨论创业公司不同阶段的估值方法，对比 DCF、可比公司法、风险投资法的适用场景', en: 'Discuss startup valuation methods at different stages, comparing DCF, comparable companies, and VC methods' } },
          { title: { zh: '平台经济治理', en: 'Platform Governance' }, prompt: { zh: '深度分析平台经济的治理难题，包括垄断问题、数据使用、从业者权益等', en: 'Deep analysis of platform economy governance: monopoly concerns, data usage, and gig worker rights' } },
          { title: { zh: 'AI 商业化路径', en: 'AI Commercialization' }, prompt: { zh: '分析 AI 公司的商业化路径选择，对比 API 服务、行业解决方案、消费级产品等模式的优劣', en: 'Analyze AI commercialization paths: API services vs industry solutions vs consumer products — pros and cons' } },
          { title: { zh: '订阅制的边界', en: 'Subscription Limits' }, prompt: { zh: '讨论订阅制商业模式的扩展边界与用户疲劳问题，分析哪些品类适合订阅，哪些不适合', en: 'Discuss subscription model limits and subscriber fatigue — which categories fit subscriptions and which don\'t' } },
        ],
      },
    ],
  },

  /* ======================== 深度研究 ======================== */
  research: {
    key: 'research',
    icon: Telescope,
    systemPrompt: {
      zh: '你是一个专业的深度研究助手。用户会给你一个研究课题，你需要像学术研究者一样，进行系统性的信息收集、文献梳理、数据分析和观点综合。请提供详尽的研究报告，包含：1) 研究背景和问题定义 2) 关键发现和数据 3) 多角度分析 4) 结论和建议 5) 参考来源。报告要求逻辑严谨、论据充分、结论有据。',
      en: 'You are a professional deep research assistant. The user will give you a research topic. Like an academic researcher, you should systematically collect information, review literature, analyze data, and synthesize viewpoints. Provide a comprehensive research report including: 1) Background and problem definition 2) Key findings and data 3) Multi-perspective analysis 4) Conclusions and recommendations 5) Reference sources. The report should be logically rigorous with well-supported conclusions.',
    },
    hero: {
      zh: { title: '深度研究', subtitle: '系统调研，专业报告' },
      en: { title: 'Deep Research', subtitle: 'Systematic research, professional reports' },
    },
    placeholder: { zh: '输入你的研究课题', en: 'Enter your research topic' },
    subCategories: [
      {
        key: 'industry',
        label: { zh: '行业研究', en: 'Industry' },
        templates: [
          { title: { zh: 'AI 行业深度报告', en: 'AI Industry Report' }, prompt: { zh: '撰写一份 2025 年人工智能行业深度研究报告，涵盖技术趋势、市场规模、竞争格局、投资热点、政策环境等方面', en: 'Write a comprehensive 2025 AI industry research report covering tech trends, market size, competitive landscape, investment hotspots, and policy environment' } },
          { title: { zh: '新能源产业链分析', en: 'New Energy Supply Chain' }, prompt: { zh: '深度研究新能源产业链上中下游的关键环节，分析技术瓶颈、成本结构、市场空间和投资机会', en: 'Deep research on new energy supply chain — key stages, tech bottlenecks, cost structure, market opportunity, and investment chances' } },
          { title: { zh: '半导体行业格局', en: 'Semiconductor Landscape' }, prompt: { zh: '研究全球半导体行业的竞争格局，包括设计、制造、封测各环节的头部企业、技术代差和地缘政治影响', en: 'Research global semiconductor competitive landscape: design, manufacturing, packaging leaders, tech gaps, and geopolitical impacts' } },
          { title: { zh: 'SaaS 市场研究', en: 'SaaS Market Research' }, prompt: { zh: '对中国企业级 SaaS 市场进行深度研究，分析市场规模、增长驱动力、竞争格局、盈利模式和未来趋势', en: 'Deep research on China enterprise SaaS market: market size, growth drivers, competition, profit models, and future trends' } },
          { title: { zh: '医疗 AI 应用报告', en: 'Medical AI Report' }, prompt: { zh: '研究医疗 AI 的应用现状和前景，包括影像诊断、药物研发、智能问诊、手术机器人等细分领域', en: 'Research medical AI applications and prospects: imaging diagnostics, drug development, smart consultation, surgical robots' } },
          { title: { zh: '元宇宙发展评估', en: 'Metaverse Assessment' }, prompt: { zh: '对元宇宙概念进行全面研究，评估其技术成熟度、商业可行性、用户接受度和发展时间线', en: 'Comprehensive research on the metaverse: assess technology maturity, commercial viability, user acceptance, and development timeline' } },
        ],
      },
      {
        key: 'academic',
        label: { zh: '学术研究', en: 'Academic' },
        templates: [
          { title: { zh: '文献综述撰写', en: 'Literature Review' }, prompt: { zh: '帮我撰写一篇关于大语言模型推理能力的文献综述，梳理最近 2 年的重要论文，分析研究脉络和前沿方向', en: 'Write a literature review on LLM reasoning capabilities, covering important papers from the last 2 years, analyzing research trends and frontiers' } },
          { title: { zh: '研究方法论设计', en: 'Research Methodology' }, prompt: { zh: '帮我设计一个用户体验研究的方法论框架，包含定性和定量方法的组合、样本设计、数据采集和分析方案', en: 'Design a UX research methodology framework combining qualitative and quantitative methods, sample design, data collection, and analysis plan' } },
          { title: { zh: '数据分析方案', en: 'Data Analysis Plan' }, prompt: { zh: '设计一套完整的数据分析方案，包括数据清洗策略、统计方法选择、可视化方案和结果解读框架', en: 'Design a complete data analysis plan: data cleaning strategy, statistical method selection, visualization approach, and result interpretation framework' } },
          { title: { zh: '实验设计方案', en: 'Experiment Design' }, prompt: { zh: '帮我设计一个 A/B 测试实验方案，包括假设制定、变量控制、样本量计算、显著性检验方法', en: 'Design an A/B test experiment plan: hypothesis formulation, variable control, sample size calculation, significance testing methods' } },
          { title: { zh: '论文框架搭建', en: 'Paper Structure' }, prompt: { zh: '帮我搭建一篇学术论文的框架，主题是"AI 在教育领域的应用研究"，给出各章节大纲和核心论点', en: 'Build an academic paper structure on "AI Applications in Education Research" with chapter outlines and core arguments' } },
          { title: { zh: '研究计划书', en: 'Research Proposal' }, prompt: { zh: '帮我撰写一份研究计划书（Research Proposal），包含研究背景、研究问题、方法论、时间安排和预期成果', en: 'Write a research proposal including background, research questions, methodology, timeline, and expected outcomes' } },
        ],
      },
      {
        key: 'product',
        label: { zh: '产品研究', en: 'Product' },
        templates: [
          { title: { zh: '竞品深度分析', en: 'Deep Competitor Analysis' }, prompt: { zh: '对某产品的 3-5 个主要竞品进行深度分析，涵盖产品定位、功能对比、技术架构、用户口碑、商业模式等维度', en: 'Deep analysis of 3-5 main competitors covering positioning, feature comparison, tech architecture, user reviews, and business models' } },
          { title: { zh: '用户画像研究', en: 'User Persona Research' }, prompt: { zh: '帮我进行目标用户画像研究，通过用户分群、行为分析、需求挖掘，构建 3-5 个典型用户画像', en: 'Conduct user persona research through user segmentation, behavior analysis, need mining, build 3-5 typical personas' } },
          { title: { zh: '产品市场匹配度', en: 'Product-Market Fit' }, prompt: { zh: '评估产品的市场匹配度(PMF)，从用户留存、NPS 评分、付费意愿、自然增长等指标进行综合分析', en: 'Assess Product-Market Fit from retention, NPS scores, willingness to pay, and organic growth metrics' } },
          { title: { zh: '功能优先级评估', en: 'Feature Prioritization' }, prompt: { zh: '使用 RICE/ICE 等框架对产品待开发功能进行优先级评估，考虑影响范围、信心度、投入成本', en: 'Prioritize product features using RICE/ICE frameworks considering reach, impact, confidence, and effort' } },
          { title: { zh: '定价策略研究', en: 'Pricing Strategy' }, prompt: { zh: '为 SaaS 产品设计定价策略，研究竞品定价、用户支付意愿、价值指标、分层方案', en: 'Design SaaS pricing strategy: research competitor pricing, willingness to pay, value metrics, and tiered plans' } },
          { title: { zh: '市场进入策略', en: 'Go-to-Market Strategy' }, prompt: { zh: '制定产品的市场进入策略(GTM)，包括目标市场选择、渠道策略、营销计划、里程碑设定', en: 'Create a Go-to-Market strategy: target market selection, channel strategy, marketing plan, and milestone setting' } },
        ],
      },
    ],
  },

  /* ======================== 代码助手 ======================== */
  code: {
    key: 'code',
    icon: CodeXml,
    systemPrompt: {
      zh: '你是一个资深的全栈开发工程师。请用专业、简洁的方式回答编程问题。代码要有注释，遵循最佳实践。如果用户没有指定语言，默认使用 TypeScript/Python。回答格式：先简要说明思路，然后给出完整可运行的代码，最后补充注意事项。',
      en: 'You are a senior full-stack developer. Answer programming questions professionally and concisely. Code should be commented and follow best practices. Default to TypeScript/Python if no language is specified. Format: brief explanation, then complete runnable code, then notes.',
    },
    hero: {
      zh: { title: '代码助手', subtitle: '专业编程，高效开发' },
      en: { title: 'Code Assistant', subtitle: 'Professional coding, efficient development' },
    },
    placeholder: { zh: '描述你需要的代码功能', en: 'Describe the code you need' },
    subCategories: [
      {
        key: 'frontend',
        label: { zh: '前端开发', en: 'Frontend' },
        templates: [
          { title: { zh: 'React 登录表单', en: 'React Login Form' }, prompt: { zh: '写一个 React + TypeScript 登录表单组件，包含邮箱验证、密码强度检测、记住密码、错误提示', en: 'Write a React + TypeScript login form with email validation, password strength check, remember me, and error messages' } },
          { title: { zh: '响应式导航栏', en: 'Responsive Navbar' }, prompt: { zh: '写一个响应式导航栏组件，PC 端水平菜单，移动端汉堡菜单，使用 TailwindCSS 实现', en: 'Write a responsive navbar: horizontal menu on desktop, hamburger on mobile, using TailwindCSS' } },
          { title: { zh: '无限滚动列表', en: 'Infinite Scroll' }, prompt: { zh: '实现一个 React 无限滚动列表组件，使用 IntersectionObserver，支持加载状态和错误重试', en: 'Implement a React infinite scroll list using IntersectionObserver with loading states and error retry' } },
          { title: { zh: '拖拽排序面板', en: 'Drag & Drop Board' }, prompt: { zh: '用 React + dnd-kit 实现一个拖拽排序面板，类似 Trello 看板，支持跨列拖拽', en: 'Build a drag-and-drop board like Trello using React + dnd-kit with cross-column dragging' } },
          { title: { zh: '深色模式切换', en: 'Dark Mode Toggle' }, prompt: { zh: '实现一个完整的深色模式方案，包含主题切换动画、localStorage 持久化、系统偏好检测', en: 'Implement a complete dark mode solution with theme toggle animation, localStorage persistence, and system preference detection' } },
          { title: { zh: '图表仪表盘', en: 'Chart Dashboard' }, prompt: { zh: '用 React + Recharts 制作一个数据仪表盘页面，包含折线图、柱状图、饼图和关键指标卡片', en: 'Create a data dashboard with React + Recharts including line chart, bar chart, pie chart, and KPI cards' } },
        ],
      },
      {
        key: 'backend',
        label: { zh: '后端开发', en: 'Backend' },
        templates: [
          { title: { zh: 'FastAPI 接口', en: 'FastAPI Endpoint' }, prompt: { zh: '用 Python FastAPI 实现一套完整的用户管理 REST API，包含注册、登录(JWT)、CRUD、权限控制', en: 'Build a complete user management REST API with Python FastAPI: signup, JWT login, CRUD, and role-based access' } },
          { title: { zh: 'WebSocket 聊天', en: 'WebSocket Chat' }, prompt: { zh: '用 Node.js + WebSocket 实现一个实时聊天服务端，支持多房间、消息历史、在线状态', en: 'Build a real-time chat server with Node.js + WebSocket supporting rooms, message history, and online status' } },
          { title: { zh: '定时任务系统', en: 'Task Scheduler' }, prompt: { zh: '用 Python 实现一个定时任务调度系统，支持 cron 表达式、任务重试、日志记录、Web 管理面板', en: 'Build a task scheduler in Python with cron expressions, retry logic, logging, and web admin panel' } },
          { title: { zh: '文件上传服务', en: 'File Upload Service' }, prompt: { zh: '实现一个文件上传微服务，支持分片上传、断点续传、文件类型校验、存储到 S3/OSS', en: 'Build a file upload microservice with chunked upload, resume, type validation, and S3/OSS storage' } },
          { title: { zh: '消息队列消费者', en: 'Message Queue Consumer' }, prompt: { zh: '用 Python + Redis/RabbitMQ 实现一个消息队列消费者，支持消息确认、死信处理、并发控制', en: 'Build a message queue consumer with Python + Redis/RabbitMQ: message ACK, dead letter handling, concurrency control' } },
          { title: { zh: 'GraphQL 服务', en: 'GraphQL Server' }, prompt: { zh: '用 Node.js + Apollo Server 搭建一个 GraphQL API，包含类型定义、resolver、数据加载器、分页', en: 'Build a GraphQL API with Node.js + Apollo Server: type definitions, resolvers, data loaders, and pagination' } },
        ],
      },
      {
        key: 'data',
        label: { zh: '数据处理', en: 'Data' },
        templates: [
          { title: { zh: 'Pandas 数据清洗', en: 'Pandas Data Cleaning' }, prompt: { zh: '用 Python Pandas 编写一套数据清洗流程：处理缺失值、去重、类型转换、异常值检测', en: 'Write a data cleaning pipeline with Python Pandas: handle missing values, dedup, type conversion, outlier detection' } },
          { title: { zh: 'SQL 复杂查询', en: 'Complex SQL Queries' }, prompt: { zh: '写一组复杂的 SQL 查询，包含窗口函数、CTE、子查询、多表 JOIN，用于分析电商销售数据', en: 'Write complex SQL queries with window functions, CTEs, subqueries, and JOINs for e-commerce sales analysis' } },
          { title: { zh: '数据可视化', en: 'Data Visualization' }, prompt: { zh: '用 Python matplotlib + seaborn 做一组精美的数据可视化图表，包含散点图、热力图、箱线图', en: 'Create beautiful data visualizations with Python matplotlib + seaborn: scatter, heatmap, and box plots' } },
          { title: { zh: 'ETL 管道', en: 'ETL Pipeline' }, prompt: { zh: '用 Python 设计一个 ETL 数据管道，从多个数据源提取数据、转换格式、加载到数据仓库', en: 'Design an ETL pipeline in Python: extract from multiple sources, transform, and load into a data warehouse' } },
          { title: { zh: 'Web 爬虫框架', en: 'Web Scraper Framework' }, prompt: { zh: '用 Python Scrapy 写一个可扩展的爬虫框架，支持代理池、反爬策略、数据持久化', en: 'Build an extensible web scraper with Python Scrapy: proxy pool, anti-bot strategies, and data persistence' } },
          { title: { zh: '日志分析脚本', en: 'Log Analysis Script' }, prompt: { zh: '写一个日志分析脚本，解析 Nginx/应用日志，统计 QPS、错误率、慢请求，生成报告', en: 'Write a log analysis script to parse Nginx/app logs, calculate QPS, error rates, slow requests, and generate reports' } },
        ],
      },
      {
        key: 'tools',
        label: { zh: '工具脚本', en: 'Scripts' },
        templates: [
          { title: { zh: 'Git 自动化', en: 'Git Automation' }, prompt: { zh: '写一组实用的 Git 自动化脚本：批量 cherry-pick、自动生成 changelog、分支清理、冲突检测', en: 'Write useful Git automation scripts: batch cherry-pick, auto-changelog, branch cleanup, conflict detection' } },
          { title: { zh: 'Docker 部署模板', en: 'Docker Templates' }, prompt: { zh: '写一套 Docker Compose 部署模板，包含前端、后端 API、数据库、Redis、Nginx 反向代理', en: 'Write a Docker Compose deployment template with frontend, backend API, database, Redis, and Nginx reverse proxy' } },
          { title: { zh: 'CI/CD 流水线', en: 'CI/CD Pipeline' }, prompt: { zh: '编写一个完整的 GitHub Actions CI/CD 配置，包含代码检查、测试、构建、部署到云服务器', en: 'Write a complete GitHub Actions CI/CD config with linting, testing, building, and deploying to cloud server' } },
          { title: { zh: '文件批量处理', en: 'Batch File Processing' }, prompt: { zh: '写一个 Python 脚本批量处理文件：重命名、格式转换、压缩图片、整理目录结构', en: 'Write a Python script for batch file operations: rename, format conversion, image compression, directory reorganization' } },
          { title: { zh: '系统监控脚本', en: 'System Monitor' }, prompt: { zh: '写一个系统监控脚本，定期检查 CPU、内存、磁盘、网络状态，超阈值自动发送告警', en: 'Write a system monitor script that checks CPU, memory, disk, network status and sends alerts when thresholds are exceeded' } },
          { title: { zh: '数据库备份工具', en: 'DB Backup Tool' }, prompt: { zh: '写一个数据库自动备份工具，支持 MySQL/PostgreSQL，定时备份、压缩、上传到云存储、过期清理', en: 'Write a database auto-backup tool for MySQL/PostgreSQL with scheduled backup, compression, cloud upload, and expiry cleanup' } },
        ],
      },
    ],
  },

  /* ======================== 图像分析 ======================== */
  image: {
    key: 'image',
    icon: Image,
    systemPrompt: {
      zh: '你是一个专业的图像分析助手。用户会上传图片让你分析。请仔细观察图片中的每个细节，从布局、色彩、内容、文字、设计等多个角度进行专业分析。如果是 UI 截图，请评估其设计质量并给出改进建议。如果是文档图片，请提取其中的文字内容。',
      en: 'You are a professional image analysis assistant. Users will upload images for you to analyze. Carefully observe every detail in the image, analyze from layout, color, content, text, design perspectives. For UI screenshots, evaluate design quality and suggest improvements. For document images, extract the text content.',
    },
    hero: {
      zh: { title: '图像分析', subtitle: '看图识物，智能解读' },
      en: { title: 'Image Analysis', subtitle: 'See, understand, and interpret' },
    },
    placeholder: { zh: '上传图片并描述你的问题', en: 'Upload an image and describe your question' },
    subCategories: [
      {
        key: 'ui',
        label: { zh: 'UI 设计', en: 'UI Design' },
        templates: [
          { title: { zh: 'UI 设计评审', en: 'UI Design Review' }, prompt: { zh: '请评审这个 UI 界面设计，从视觉层次、色彩搭配、间距布局、可用性等方面给出专业评价和改进建议', en: 'Review this UI design on visual hierarchy, color scheme, spacing, layout, and usability with professional feedback' } },
          { title: { zh: '竞品界面对比', en: 'UI Comparison' }, prompt: { zh: '对比分析这两个产品的界面设计，从信息架构、交互模式、视觉风格等方面找出差异和优劣', en: 'Compare two product interfaces on information architecture, interaction patterns, and visual styles' } },
          { title: { zh: '移动端适配检查', en: 'Mobile Adaptation' }, prompt: { zh: '检查这个界面的移动端适配情况，标注可能存在的触控区域过小、内容溢出、排版错乱等问题', en: 'Check this interface\'s mobile adaptation, flag issues like small touch targets, content overflow, layout breaks' } },
          { title: { zh: '设计规范检查', en: 'Design System Check' }, prompt: { zh: '检查这个界面是否符合设计规范，分析字体、颜色、圆角、间距等是否统一一致', en: 'Check if this interface follows design system rules: font, color, border radius, and spacing consistency' } },
          { title: { zh: '无障碍评估', en: 'Accessibility Audit' }, prompt: { zh: '从无障碍角度评估这个界面，检查对比度、标签可读性、键盘导航等 WCAG 标准合规情况', en: 'Evaluate this interface for accessibility: contrast ratio, label readability, keyboard navigation per WCAG standards' } },
          { title: { zh: '动效设计建议', en: 'Animation Suggestions' }, prompt: { zh: '分析这个界面可以添加哪些微动效来提升交互体验，给出具体的动画参数建议', en: 'Suggest micro-animations to enhance this interface\'s UX with specific animation parameter recommendations' } },
        ],
      },
      {
        key: 'ocr',
        label: { zh: '文字识别', en: 'OCR' },
        templates: [
          { title: { zh: '文档文字提取', en: 'Document OCR' }, prompt: { zh: '请识别并提取这张文档图片中的所有文字内容，保持原始的格式和排版结构', en: 'Extract all text from this document image, preserving the original formatting and layout structure' } },
          { title: { zh: '表格数据识别', en: 'Table Recognition' }, prompt: { zh: '识别这张图片中的表格数据，转换为结构化的 Markdown 表格或 CSV 格式', en: 'Recognize the table data in this image and convert to structured Markdown table or CSV format' } },
          { title: { zh: '手写内容识别', en: 'Handwriting OCR' }, prompt: { zh: '识别这张图片中的手写文字内容，尽可能准确地转录为电子文本', en: 'Recognize handwritten text in this image and transcribe as accurately as possible to digital text' } },
          { title: { zh: '名片信息提取', en: 'Business Card OCR' }, prompt: { zh: '提取这张名片中的所有信息，整理为姓名、职位、公司、电话、邮箱、地址等结构化字段', en: 'Extract all information from this business card into structured fields: name, title, company, phone, email, address' } },
          { title: { zh: '发票信息提取', en: 'Invoice OCR' }, prompt: { zh: '识别这张发票图片中的关键信息：发票号、日期、金额、购买方、销售方等', en: 'Extract key information from this invoice image: invoice number, date, amount, buyer, seller, etc.' } },
          { title: { zh: '多语言文字识别', en: 'Multi-lang OCR' }, prompt: { zh: '识别这张图片中的多语言文字内容，标注每段文字的语言类型', en: 'Recognize multi-language text in this image and label each section\'s language' } },
        ],
      },
      {
        key: 'understand',
        label: { zh: '图片理解', en: 'Understanding' },
        templates: [
          { title: { zh: '场景描述', en: 'Scene Description' }, prompt: { zh: '详细描述这张图片的场景内容，包括环境、人物、物品、动作、氛围等要素', en: 'Describe this image\'s scene in detail including environment, people, objects, actions, and atmosphere' } },
          { title: { zh: '图表数据解读', en: 'Chart Interpretation' }, prompt: { zh: '解读这张图表的数据含义，分析趋势、异常点和关键洞察', en: 'Interpret this chart\'s data, analyze trends, anomalies, and key insights' } },
          { title: { zh: '产品识别', en: 'Product Identification' }, prompt: { zh: '识别图片中的产品或物品，给出名称、品牌、型号等信息，并描述其特征', en: 'Identify the product or item in this image, provide name, brand, model, and describe its features' } },
          { title: { zh: '建筑风格鉴赏', en: 'Architecture Analysis' }, prompt: { zh: '分析这张建筑照片的建筑风格、年代特征、设计亮点和艺术价值', en: 'Analyze this building\'s architectural style, era features, design highlights, and artistic value' } },
          { title: { zh: '代码截图分析', en: 'Code Screenshot' }, prompt: { zh: '分析这张代码截图中的代码逻辑，找出可能的 bug 或性能问题，给出优化建议', en: 'Analyze the code logic in this screenshot, find potential bugs or performance issues, suggest improvements' } },
          { title: { zh: '食物营养分析', en: 'Food Nutrition' }, prompt: { zh: '识别这张图片中的食物，估算每种食物的热量、营养成分，给出健康饮食建议', en: 'Identify foods in this image, estimate calories and nutrients for each, provide healthy eating suggestions' } },
        ],
      },
    ],
  },

  /* ======================== 翻译助手 ======================== */
  translate: {
    key: 'translate',
    icon: Languages,
    systemPrompt: {
      zh: '你是一个专业的翻译助手，精通中文、英文、日文、韩文、法文、德文等多种语言。翻译要求：1) 准确传达原文含义 2) 符合目标语言的表达习惯 3) 保持原文的语气和风格。如果用户没有指定目标语言，中文翻译成英文，其他语言翻译成中文。翻译后可附上关键词汇的解释。',
      en: 'You are a professional translation assistant fluent in Chinese, English, Japanese, Korean, French, German, etc. Translation requirements: 1) Accurately convey the original meaning 2) Follow target language conventions 3) Maintain the tone and style. If no target language is specified, translate Chinese to English, and other languages to Chinese. You may append explanations for key terms.',
    },
    hero: {
      zh: { title: '翻译助手', subtitle: '多语言互译，信达雅' },
      en: { title: 'Translator', subtitle: 'Multi-language translation, faithful and elegant' },
    },
    placeholder: { zh: '输入需要翻译的内容', en: 'Enter text to translate' },
    subCategories: [
      {
        key: 'general',
        label: { zh: '日常翻译', en: 'General' },
        templates: [
          { title: { zh: '中英互译', en: 'CN-EN Translation' }, prompt: { zh: '请将以下内容在中文和英文之间互译，保持原文风格和语气', en: 'Translate the following between Chinese and English, maintaining the original style and tone' } },
          { title: { zh: '日语翻译', en: 'Japanese Translation' }, prompt: { zh: '将以下内容翻译为日语/从日语翻译为中文，注意敬语和语境', en: 'Translate to/from Japanese, paying attention to politeness levels and context' } },
          { title: { zh: '韩语翻译', en: 'Korean Translation' }, prompt: { zh: '将以下内容翻译为韩语/从韩语翻译为中文，注意口语和书面语差异', en: 'Translate to/from Korean, noting differences between spoken and written forms' } },
          { title: { zh: '法语翻译', en: 'French Translation' }, prompt: { zh: '将以下内容翻译为法语/从法语翻译为中文，保持优雅的表达方式', en: 'Translate to/from French, maintaining elegant expression style' } },
          { title: { zh: '多语言对照', en: 'Multi-lang Comparison' }, prompt: { zh: '将以下内容同时翻译为英文、日文、韩文，方便对比不同语言的表达', en: 'Translate the following into English, Japanese, and Korean simultaneously for expression comparison' } },
          { title: { zh: '语法纠错', en: 'Grammar Correction' }, prompt: { zh: '检查并纠正以下外语文本中的语法错误，说明每处修改的原因', en: 'Check and correct grammar errors in the following foreign text, explaining each correction' } },
        ],
      },
      {
        key: 'academic',
        label: { zh: '学术翻译', en: 'Academic' },
        templates: [
          { title: { zh: '论文摘要翻译', en: 'Paper Abstract' }, prompt: { zh: '将这篇论文摘要翻译为中文/英文，保持学术用语的准确性和专业性', en: 'Translate this paper abstract to Chinese/English, maintaining academic terminology accuracy' } },
          { title: { zh: '技术文档翻译', en: 'Technical Docs' }, prompt: { zh: '翻译这份技术文档，确保专业术语准确，代码示例保留原文', en: 'Translate this technical document, ensuring accurate terminology and preserving code examples' } },
          { title: { zh: '文献综述翻译', en: 'Literature Review' }, prompt: { zh: '翻译这段文献综述内容，注意学术引用格式的保留和专业表述', en: 'Translate this literature review, preserving academic citation formats and professional expressions' } },
          { title: { zh: '专利文件翻译', en: 'Patent Translation' }, prompt: { zh: '翻译这份专利文件的权利要求部分，确保法律用语的准确性', en: 'Translate the claims section of this patent document, ensuring legal terminology accuracy' } },
          { title: { zh: '实验报告翻译', en: 'Lab Report' }, prompt: { zh: '翻译这份实验报告，包含实验方法、数据描述和结论分析部分', en: 'Translate this lab report including methods, data description, and conclusion analysis sections' } },
          { title: { zh: '学术邮件润色', en: 'Academic Email' }, prompt: { zh: '帮我润色这封给导师/审稿人的学术邮件，使语言更加正式和专业', en: 'Polish this academic email to advisor/reviewer, making it more formal and professional' } },
        ],
      },
      {
        key: 'business',
        label: { zh: '商务翻译', en: 'Business' },
        templates: [
          { title: { zh: '商务邮件翻译', en: 'Business Email' }, prompt: { zh: '翻译这封商务邮件，保持正式的商务语气，确保礼貌和专业', en: 'Translate this business email maintaining formal tone, ensuring politeness and professionalism' } },
          { title: { zh: '产品说明书翻译', en: 'Product Manual' }, prompt: { zh: '翻译这份产品说明书，确保技术参数准确，用语符合目标市场习惯', en: 'Translate this product manual, ensuring accurate specs and target market language conventions' } },
          { title: { zh: '合同条款翻译', en: 'Contract Terms' }, prompt: { zh: '翻译这些合同条款，确保法律用语准确，不改变原文的法律含义', en: 'Translate these contract terms, ensuring accurate legal language without altering legal meaning' } },
          { title: { zh: '新闻稿翻译', en: 'Press Release' }, prompt: { zh: '翻译这篇企业新闻稿，使其符合目标语言的新闻写作风格', en: 'Translate this press release to match the target language\'s journalistic writing style' } },
          { title: { zh: '营销文案翻译', en: 'Marketing Copy' }, prompt: { zh: '翻译这段营销文案，在保持品牌调性的同时做适当的本地化调整', en: 'Translate this marketing copy with brand tone preservation and appropriate localization adjustments' } },
          { title: { zh: '财报数据翻译', en: 'Financial Report' }, prompt: { zh: '翻译这份财务报告的关键段落，确保财务术语和数据表述的准确性', en: 'Translate key sections of this financial report, ensuring accuracy of financial terms and data expressions' } },
        ],
      },
    ],
  },

  /* ======================== AI 写作 ======================== */
  write: {
    key: 'write',
    icon: Pen,
    systemPrompt: {
      zh: '你是一个专业的 AI 写作助手。擅长各类文体写作：文章、报告、文案、脚本、诗歌等。请根据用户的要求，生成高质量的文字内容。注意：1) 内容原创，逻辑清晰 2) 语言优美，表达得体 3) 结构完整，层次分明。如果用户给了主题但没有具体要求，请先确认写作类型、字数、风格等再开始。',
      en: 'You are a professional AI writing assistant. Skilled in various writing formats: articles, reports, copy, scripts, poetry, etc. Generate high-quality content based on user requirements. Note: 1) Original content with clear logic 2) Elegant language 3) Complete structure. If the user gives a topic without specifics, confirm writing type, length, and style first.',
    },
    hero: {
      zh: { title: 'AI 写作', subtitle: '妙笔生花，文思泉涌' },
      en: { title: 'AI Writing', subtitle: 'Eloquent words, flowing ideas' },
    },
    placeholder: { zh: '告诉我你想写什么', en: 'Tell me what you want to write' },
    subCategories: [
      {
        key: 'business',
        label: { zh: '商务写作', en: 'Business' },
        templates: [
          { title: { zh: '产品发布演讲稿', en: 'Product Launch Speech' }, prompt: { zh: '帮我写一篇产品发布会的主题演讲稿，15 分钟时长，要有开场吸引力、产品亮点展示、用户故事、未来愿景', en: 'Write a 15-minute product launch keynote with an engaging opening, product highlights, user stories, and future vision' } },
          { title: { zh: '季度工作报告', en: 'Quarterly Report' }, prompt: { zh: '帮我写一份季度工作汇报，包含项目进展、数据成果、问题复盘、下季度规划四个部分', en: 'Write a quarterly work report with project progress, data results, issue retrospective, and next quarter plans' } },
          { title: { zh: '商业计划书', en: 'Business Plan' }, prompt: { zh: '帮我写一份创业商业计划书大纲，包含市场分析、产品定位、商业模式、团队介绍、融资规划', en: 'Draft a startup business plan outline with market analysis, product positioning, business model, team intro, and funding plan' } },
          { title: { zh: '项目提案文档', en: 'Project Proposal' }, prompt: { zh: '帮我撰写一份项目提案文档，包含背景分析、解决方案、实施路径、预期成果、预算评估', en: 'Write a project proposal with background analysis, solution, implementation path, expected outcomes, and budget' } },
          { title: { zh: '客户案例故事', en: 'Case Study' }, prompt: { zh: '帮我写一篇客户成功案例，按照「挑战—方案—成果」的结构，突出产品价值', en: 'Write a customer success story following the challenge-solution-result structure, highlighting product value' } },
          { title: { zh: '会议记录整理', en: 'Meeting Minutes' }, prompt: { zh: '帮我将这次会议的讨论内容整理成正式的会议纪要，提炼决议事项和责任人', en: 'Organize this meeting discussion into formal minutes with decisions and responsible persons' } },
        ],
      },
      {
        key: 'tech',
        label: { zh: '技术写作', en: 'Tech Writing' },
        templates: [
          { title: { zh: 'AI 技术博客', en: 'AI Tech Blog' }, prompt: { zh: '写一篇关于最新 AI 技术趋势的技术博客文章，面向开发者读者，2000 字左右', en: 'Write a ~2000 word tech blog about latest AI trends for a developer audience' } },
          { title: { zh: 'API 文档', en: 'API Documentation' }, prompt: { zh: '帮我编写一份 RESTful API 接口文档，包含接口描述、请求/响应示例、错误码说明', en: 'Write RESTful API documentation with endpoint descriptions, request/response examples, and error codes' } },
          { title: { zh: '开源项目 README', en: 'Open Source README' }, prompt: { zh: '帮我写一份开源项目的 README，包含项目介绍、特性列表、快速开始、使用示例、贡献指南', en: 'Write an open source project README with intro, features, quick start, examples, and contributing guide' } },
          { title: { zh: '架构设计文档', en: 'Architecture Doc' }, prompt: { zh: '帮我撰写一份系统架构设计文档，描述整体架构、模块划分、技术选型、数据流向', en: 'Write a system architecture document describing overall design, modules, tech choices, and data flow' } },
          { title: { zh: '技术方案评审', en: 'Tech Review Doc' }, prompt: { zh: '帮我写一份技术方案评审文档，包含问题背景、方案对比、推荐方案、风险评估', en: 'Write a technical review document with problem background, solution comparison, recommendation, and risk assessment' } },
          { title: { zh: '发布公告', en: 'Release Notes' }, prompt: { zh: '帮我写一份产品版本发布公告，列出新功能、优化项、已修复的 bug，语言简洁专业', en: 'Write product release notes listing new features, improvements, and bug fixes in concise professional language' } },
        ],
      },
      {
        key: 'creative',
        label: { zh: '创意文案', en: 'Creative' },
        templates: [
          { title: { zh: '产品推广文案', en: 'Product Marketing' }, prompt: { zh: '帮我写一段产品推广文案，要求有吸引力的标题、痛点共鸣、产品优势、行动号召', en: 'Write product marketing copy with an attention-grabbing headline, pain point resonance, product advantages, and CTA' } },
          { title: { zh: '社交媒体文案', en: 'Social Media Copy' }, prompt: { zh: '帮我写一组适合不同社交平台的推广文案（微博、小红书、抖音），各有侧重', en: 'Write platform-specific social media copy for Weibo, Xiaohongshu, and Douyin with different focuses' } },
          { title: { zh: '品牌故事', en: 'Brand Story' }, prompt: { zh: '帮我写一篇品牌故事，从创始初心、发展历程、核心价值观三个角度，传递品牌温度', en: 'Write a brand story from founding inspiration, development journey, and core values to convey brand warmth' } },
          { title: { zh: '短视频脚本', en: 'Short Video Script' }, prompt: { zh: '帮我写一个 60 秒的短视频脚本，包含分镜描述、台词、音效提示、字幕建议', en: 'Write a 60-second short video script with shot descriptions, dialogue, sound cues, and subtitle suggestions' } },
          { title: { zh: '活动策划文案', en: 'Event Planning' }, prompt: { zh: '帮我写一份线下活动策划方案，包含活动主题、流程安排、物料清单、宣传文案', en: 'Write an event planning document with theme, schedule, materials list, and promotional copy' } },
          { title: { zh: '电子邮件营销', en: 'Email Campaign' }, prompt: { zh: '帮我写一组电子邮件营销序列（欢迎邮件→功能介绍→案例分享→促销优惠），提高转化率', en: 'Write an email marketing sequence (welcome → feature intro → case study → promo offer) to boost conversion' } },
        ],
      },
    ],
  },

  /* ======================== 指令中心 ======================== */
  command: {
    key: 'command',
    icon: Terminal,
    systemPrompt: {
      zh: '你是一个智能指令中心。用户会给你自然语言指令，你需要理解指令意图并执行。你可以：1) 解析复杂的多步骤指令 2) 将自然语言转化为结构化操作 3) 批量处理任务 4) 自动化工作流程。回答要直接、高效，优先输出可执行的结果。',
      en: 'You are an intelligent command center. Users give you natural language instructions to understand and execute. You can: 1) Parse complex multi-step instructions 2) Convert natural language to structured operations 3) Batch process tasks 4) Automate workflows. Responses should be direct, efficient, and prioritize executable results.',
    },
    hero: {
      zh: { title: '指令中心', subtitle: '自然语言驱动，智能执行' },
      en: { title: 'Command Center', subtitle: 'Natural language driven, intelligent execution' },
    },
    placeholder: { zh: '输入你的指令', en: 'Enter your command' },
    subCategories: [
      {
        key: 'automation',
        label: { zh: '自动化', en: 'Automation' },
        templates: [
          { title: { zh: '批量文件重命名', en: 'Batch Rename Files' }, prompt: { zh: '帮我写一个批量文件重命名的脚本指令，按照"日期_序号_原文件名"的格式重命名当前目录下所有图片', en: 'Write a batch file rename script to rename all images in current directory as "date_index_originalname"' } },
          { title: { zh: '定时任务配置', en: 'Cron Job Setup' }, prompt: { zh: '帮我配置一个定时任务：每天凌晨 2 点自动备份数据库，压缩后上传到远程服务器，保留最近 7 天的备份', en: 'Configure a cron job: auto backup database at 2AM daily, compress and upload to remote server, keep last 7 days' } },
          { title: { zh: '工作流编排', en: 'Workflow Orchestration' }, prompt: { zh: '帮我设计一个数据处理工作流：数据采集→清洗→转换→分析→可视化→报告生成，每个步骤给出具体实现', en: 'Design a data processing workflow: collect→clean→transform→analyze→visualize→report, with specific implementation for each step' } },
          { title: { zh: '环境配置一键脚本', en: 'Environment Setup Script' }, prompt: { zh: '帮我写一个开发环境一键配置脚本，安装 Node.js、Python、Docker、Git，配置常用 alias 和环境变量', en: 'Write a one-click dev environment setup script: install Node.js, Python, Docker, Git, configure common aliases and env vars' } },
          { title: { zh: '日志清理自动化', en: 'Log Cleanup Automation' }, prompt: { zh: '帮我编写一个日志自动清理脚本，按大小和时间策略轮转日志，清理超过 30 天或超过 1GB 的日志文件', en: 'Write a log cleanup script with size/time rotation policy, clean logs older than 30 days or larger than 1GB' } },
          { title: { zh: '监控告警配置', en: 'Monitor Alert Setup' }, prompt: { zh: '帮我配置一套服务监控告警方案：CPU>80%、内存>90%、磁盘>85% 时发送邮件和企业微信通知', en: 'Configure monitoring alerts: send email and WeChat notifications when CPU>80%, memory>90%, disk>85%' } },
        ],
      },
      {
        key: 'convert',
        label: { zh: '格式转换', en: 'Convert' },
        templates: [
          { title: { zh: 'JSON ↔ CSV 转换', en: 'JSON ↔ CSV Convert' }, prompt: { zh: '帮我写一个 JSON 和 CSV 格式互转的工具，支持嵌套 JSON 展平、自定义分隔符、编码处理', en: 'Write a JSON-CSV converter tool supporting nested JSON flattening, custom delimiters, and encoding handling' } },
          { title: { zh: 'Markdown → HTML', en: 'Markdown → HTML' }, prompt: { zh: '帮我实现一个 Markdown 转 HTML 的转换器，支持表格、代码高亮、数学公式、目录生成', en: 'Implement a Markdown to HTML converter supporting tables, code highlighting, math formulas, and TOC generation' } },
          { title: { zh: '图片格式批量转换', en: 'Image Format Convert' }, prompt: { zh: '帮我写一个图片批量格式转换脚本，支持 PNG/JPG/WebP/AVIF 互转，可设置质量参数和尺寸缩放', en: 'Write a batch image format converter: PNG/JPG/WebP/AVIF with quality settings and resize options' } },
          { title: { zh: 'SQL ↔ NoSQL 迁移', en: 'SQL ↔ NoSQL Migration' }, prompt: { zh: '帮我设计一个从 MySQL 迁移到 MongoDB 的数据转换方案，包括 schema 映射、数据迁移脚本、验证策略', en: 'Design a MySQL to MongoDB migration plan with schema mapping, data migration scripts, and validation strategy' } },
          { title: { zh: 'API 格式适配', en: 'API Format Adapter' }, prompt: { zh: '帮我写一个 API 格式适配层，将旧版 REST API 的响应格式转换为新的 GraphQL schema 格式', en: 'Write an API format adapter layer to convert legacy REST API responses to new GraphQL schema format' } },
          { title: { zh: '文档格式转换', en: 'Document Convert' }, prompt: { zh: '帮我实现一个文档格式转换工具，支持 Markdown/HTML/PDF/DOCX 之间的互转，保持排版格式', en: 'Implement a document format converter supporting Markdown/HTML/PDF/DOCX conversion while preserving formatting' } },
        ],
      },
    ],
  },

  /* ======================== PPT 演示 ======================== */
  ppt: {
    key: 'ppt',
    icon: Presentation,
    systemPrompt: {
      zh: '你是一个专业的 PPT 演示文稿设计助手。你擅长：1) 根据主题设计 PPT 大纲和内容结构 2) 为每页幻灯片提供标题、核心内容、设计建议 3) 生成演讲者备注 4) 建议配色方案和版式布局。回答要注重视觉表达和信息层次，内容精炼、重点突出。',
      en: 'You are a professional PPT presentation design assistant. You excel at: 1) Designing PPT outlines and content structure by topic 2) Providing title, key content, and design suggestions per slide 3) Generating speaker notes 4) Suggesting color schemes and layouts. Focus on visual expression, information hierarchy, concise content, and clear highlights.',
    },
    hero: {
      zh: { title: 'PPT 演示', subtitle: '专业演示，精彩呈现' },
      en: { title: 'PPT Design', subtitle: 'Professional presentations, brilliant delivery' },
    },
    placeholder: { zh: '描述你的演示主题', en: 'Describe your presentation topic' },
    subCategories: [
      {
        key: 'business',
        label: { zh: '商务汇报', en: 'Business' },
        templates: [
          { title: { zh: '季度业绩汇报', en: 'Quarterly Review' }, prompt: { zh: '帮我设计一份季度业绩汇报 PPT，20 页左右，包含业绩总览、核心指标分析、项目进展、团队贡献、下季度目标，每页给出标题和内容要点', en: 'Design a ~20 slide quarterly review PPT with performance overview, KPI analysis, project progress, team contributions, and next quarter goals' } },
          { title: { zh: '产品发布会', en: 'Product Launch' }, prompt: { zh: '帮我设计一份产品发布会 PPT，包含开场引入、市场痛点、产品解决方案、核心功能演示、定价策略、Q&A 环节', en: 'Design a product launch PPT with opening hook, market pain points, product solution, core feature demo, pricing strategy, and Q&A section' } },
          { title: { zh: '融资路演', en: 'Pitch Deck' }, prompt: { zh: '帮我设计一份创业融资路演 PPT（Pitch Deck），12-15 页，涵盖痛点、解决方案、商业模式、市场规模、竞争优势、团队、财务预测、融资需求', en: 'Design a 12-15 slide startup pitch deck covering problem, solution, business model, market size, competitive advantage, team, financials, and ask' } },
          { title: { zh: '年终总结', en: 'Annual Summary' }, prompt: { zh: '帮我设计一份年终工作总结 PPT，回顾全年成果、数据亮点、困难与突破、个人成长、来年展望', en: 'Design an annual summary PPT reviewing yearly achievements, data highlights, challenges, personal growth, and next year outlook' } },
          { title: { zh: '战略规划', en: 'Strategic Plan' }, prompt: { zh: '帮我设计一份公司战略规划 PPT，包含行业分析、公司现状、战略目标、实施路径、资源需求、里程碑', en: 'Design a strategic planning PPT with industry analysis, current state, strategic goals, implementation path, resources, and milestones' } },
          { title: { zh: '项目提案', en: 'Project Proposal' }, prompt: { zh: '帮我设计一份新项目提案 PPT，包含项目背景、目标定义、解决方案、技术架构、时间线、预算、风险评估', en: 'Design a project proposal PPT with background, goals, solution, tech architecture, timeline, budget, and risk assessment' } },
        ],
      },
      {
        key: 'teaching',
        label: { zh: '教学课件', en: 'Teaching' },
        templates: [
          { title: { zh: '课程教学课件', en: 'Course Slides' }, prompt: { zh: '帮我设计一节 45 分钟课程的教学课件 PPT，主题是"人工智能基础"，包含知识点讲解、案例分析、互动环节、课后练习', en: 'Design a 45-min course PPT on "AI Fundamentals" with knowledge points, case studies, interactive sections, and exercises' } },
          { title: { zh: '培训材料', en: 'Training Material' }, prompt: { zh: '帮我设计一份新员工入职培训 PPT，包含公司介绍、企业文化、组织架构、工作流程、福利制度、Q&A', en: 'Design a new employee onboarding PPT with company intro, culture, org structure, workflows, benefits, and Q&A' } },
          { title: { zh: '学术答辩', en: 'Thesis Defense' }, prompt: { zh: '帮我设计一份毕业论文答辩 PPT，15-20 页，包含研究背景、文献综述、研究方法、实验结果、结论与展望', en: 'Design a 15-20 slide thesis defense PPT with research background, literature review, methodology, results, and conclusions' } },
          { title: { zh: '技术分享', en: 'Tech Talk' }, prompt: { zh: '帮我设计一份技术分享 PPT，主题是"微前端架构实践"，包含背景、方案选型、架构设计、踩坑经验、最佳实践', en: 'Design a tech talk PPT on "Micro-frontend Architecture" with background, solution selection, design, pitfalls, and best practices' } },
          { title: { zh: '读书分享', en: 'Book Review' }, prompt: { zh: '帮我设计一份读书分享 PPT，书目是《思考，快与慢》，包含作者介绍、核心观点、关键实验、生活应用', en: 'Design a book review PPT for "Thinking, Fast and Slow" with author intro, core ideas, key experiments, and life applications' } },
          { title: { zh: '工作坊材料', en: 'Workshop Material' }, prompt: { zh: '帮我设计一份设计思维工作坊的引导材料 PPT，包含热身活动、方法论介绍、实操环节、模板工具、总结复盘', en: 'Design a Design Thinking workshop PPT with warm-up, methodology, hands-on exercises, templates, and retrospective' } },
        ],
      },
      {
        key: 'creative',
        label: { zh: '创意设计', en: 'Creative' },
        templates: [
          { title: { zh: '品牌介绍', en: 'Brand Introduction' }, prompt: { zh: '帮我设计一份品牌介绍 PPT，包含品牌故事、视觉识别系统、产品线展示、品牌价值主张、合作案例', en: 'Design a brand introduction PPT with brand story, visual identity, product line, value proposition, and partner cases' } },
          { title: { zh: '作品集展示', en: 'Portfolio Showcase' }, prompt: { zh: '帮我设计一份个人作品集 PPT，包含自我介绍、设计理念、项目案例（背景、过程、成果）、技能清单', en: 'Design a personal portfolio PPT with self-intro, design philosophy, project cases, and skills list' } },
          { title: { zh: '活动策划方案', en: 'Event Plan' }, prompt: { zh: '帮我设计一份线下活动策划方案 PPT，包含活动概念、目标受众、场地布置、流程设计、预算明细', en: 'Design an event planning PPT with concept, target audience, venue layout, program design, and budget details' } },
          { title: { zh: '旅行攻略', en: 'Travel Guide' }, prompt: { zh: '帮我设计一份日本旅行攻略 PPT，包含行程规划、景点推荐、美食地图、交通指南、预算估算', en: 'Design a Japan travel guide PPT with itinerary, attractions, food map, transport guide, and budget estimate' } },
          { title: { zh: '婚礼策划', en: 'Wedding Planning' }, prompt: { zh: '帮我设计一份婚礼策划方案 PPT，包含主题风格、场地布置、流程安排、嘉宾座次、供应商清单', en: 'Design a wedding planning PPT with theme, venue decoration, ceremony flow, seating chart, and vendor list' } },
          { title: { zh: '摄影展示', en: 'Photography Showcase' }, prompt: { zh: '帮我设计一份摄影作品展示 PPT，包含主题分类、作品故事、拍摄参数、后期思路，每页一张作品配说明', en: 'Design a photography showcase PPT with themed categories, photo stories, camera settings, and post-processing notes' } },
        ],
      },
    ],
  },

  /* ======================== 儿童教育 ======================== */
  kids: {
    key: 'kids',
    icon: GraduationCap,
    systemPrompt: {
      zh: '你是一个专业的儿童教育助手，擅长为 3-12 岁的儿童创建有趣、有教育意义的内容。你的回答要：1) 语言生动活泼，适合孩子理解 2) 融入趣味元素（故事、游戏、谜语等）3) 符合儿童认知发展规律 4) 安全正向，传递积极价值观。可以创作绘本故事、设计学习游戏、编写启蒙教材等。',
      en: 'You are a professional children\'s education assistant for ages 3-12. Your responses should: 1) Use vivid, child-friendly language 2) Include fun elements (stories, games, riddles) 3) Follow child cognitive development principles 4) Be safe and positive. You can create picture books, learning games, and educational materials.',
    },
    hero: {
      zh: { title: '儿童教育', subtitle: '寓教于乐，快乐成长' },
      en: { title: 'Kids Education', subtitle: 'Learning through play, growing with joy' },
    },
    placeholder: { zh: '描述你想为孩子创建的内容', en: 'Describe what you want to create for kids' },
    subCategories: [
      {
        key: 'picturebook',
        label: { zh: '儿童绘本', en: 'Picture Books' },
        templates: [
          { title: { zh: '睡前故事绘本', en: 'Bedtime Story' }, prompt: { zh: '帮我创作一个适合 3-5 岁孩子的睡前故事绘本，主题是"小兔子找月亮"，8-10 页，每页配文字和画面描述，语言温馨柔和', en: 'Create a bedtime picture book for ages 3-5 about "Little Bunny Finding the Moon", 8-10 pages with text and illustration descriptions' } },
          { title: { zh: '情绪管理绘本', en: 'Emotions Book' }, prompt: { zh: '帮我创作一个帮助孩子认识和管理情绪的绘本，主角是一只小恐龙，教孩子识别开心、难过、生气、害怕等情绪', en: 'Create a picture book helping kids understand emotions, starring a little dinosaur learning to identify happiness, sadness, anger, and fear' } },
          { title: { zh: '科普知识绘本', en: 'Science Picture Book' }, prompt: { zh: '帮我创作一个关于太阳系的儿童科普绘本，用拟人化的方式介绍八大行星，每颗星球一页，附有趣的知识点', en: 'Create a solar system science picture book with personified planets, one page per planet with fun facts' } },
          { title: { zh: '友谊主题绘本', en: 'Friendship Book' }, prompt: { zh: '帮我创作一个关于友谊的绘本故事，讲述不同性格的小动物如何成为好朋友，传递包容和友爱的价值观', en: 'Create a friendship picture book about different animal characters becoming friends, teaching tolerance and kindness' } },
          { title: { zh: '习惯养成绘本', en: 'Good Habits Book' }, prompt: { zh: '帮我创作一个培养好习惯的绘本，主题是"早起的小鸟"，帮助孩子建立早睡早起、整理物品的好习惯', en: 'Create a good habits picture book about "The Early Bird" helping kids develop routines for sleeping early and organizing' } },
          { title: { zh: '安全教育绘本', en: 'Safety Education' }, prompt: { zh: '帮我创作一个儿童安全教育绘本，用轻松的方式教孩子交通安全、防溺水、不跟陌生人走等安全知识', en: 'Create a safety education picture book teaching kids about traffic safety, water safety, and stranger danger' } },
        ],
      },
      {
        key: 'enlighten',
        label: { zh: '启蒙教育', en: 'Early Learning' },
        templates: [
          { title: { zh: '数学启蒙游戏', en: 'Math Games' }, prompt: { zh: '帮我设计一套适合 4-6 岁孩子的数学启蒙互动游戏，包含数数、比大小、简单加减法，每个游戏配趣味故事情境', en: 'Design math games for ages 4-6: counting, comparing, simple addition/subtraction, each with fun story contexts' } },
          { title: { zh: '英文字母学习', en: 'Alphabet Learning' }, prompt: { zh: '帮我设计一套 26 个英文字母的趣味学习方案，每个字母配一个小动物、一首儿歌、一个小游戏', en: 'Design an alphabet learning program: each letter paired with an animal, a song, and a mini game' } },
          { title: { zh: '古诗词启蒙', en: 'Chinese Poetry' }, prompt: { zh: '帮我设计一套适合 5-8 岁孩子的古诗词启蒙课程，选 10 首经典古诗，每首配白话翻译、趣味解读、记忆口诀', en: 'Design a Chinese poetry course for ages 5-8: 10 classic poems with modern translations, fun interpretations, and memory tricks' } },
          { title: { zh: '自然探索课程', en: 'Nature Exploration' }, prompt: { zh: '帮我设计一套户外自然探索启蒙课程，包含观察植物、认识昆虫、天气记录、季节变化，每个主题配观察任务', en: 'Design a nature exploration course: plants, insects, weather recording, seasons, each with observation tasks' } },
          { title: { zh: '音乐节奏启蒙', en: 'Music & Rhythm' }, prompt: { zh: '帮我设计一套 3-6 岁音乐启蒙方案，包含节奏感训练、简单乐器体验、儿歌学唱、身体律动游戏', en: 'Design a music program for ages 3-6: rhythm training, instrument exploration, nursery rhymes, and movement games' } },
          { title: { zh: '逻辑思维训练', en: 'Logic Training' }, prompt: { zh: '帮我设计一套 5-8 岁孩子的逻辑思维训练题，包含找规律、分类排序、简单推理、迷宫，难度由易到难', en: 'Design logic exercises for ages 5-8: patterns, sorting, reasoning, and mazes, easy to hard progression' } },
        ],
      },
      {
        key: 'crafts',
        label: { zh: '创意手工', en: 'Arts & Crafts' },
        templates: [
          { title: { zh: '手工折纸教程', en: 'Origami Tutorial' }, prompt: { zh: '帮我设计 10 个适合 4-8 岁孩子的手工折纸教程，从简单到复杂，每个作品配分步骤说明和趣味故事', en: 'Design 10 origami tutorials for ages 4-8, simple to complex, each with step-by-step instructions and fun stories' } },
          { title: { zh: '创意绘画引导', en: 'Creative Drawing' }, prompt: { zh: '帮我设计一套创意绘画引导课程，教孩子用简单形状画小动物、画场景、画四季，每节课配范画步骤', en: 'Design creative drawing lessons: animals, scenes, and seasons with simple shapes, each with step-by-step examples' } },
          { title: { zh: '科学小实验', en: 'Science Experiments' }, prompt: { zh: '帮我设计 8 个适合在家做的儿童科学小实验，用厨房材料完成，每个实验说明原理、步骤和安全注意事项', en: 'Design 8 home science experiments using kitchen materials, each with principle, steps, and safety notes' } },
          { title: { zh: '粘土手工', en: 'Clay Crafts' }, prompt: { zh: '帮我设计一套粘土手工教程，教孩子制作小动物、食物、交通工具等造型，配材料清单和步骤描述', en: 'Design clay crafting tutorials for animals, food, and vehicles, each with materials list and step-by-step descriptions' } },
          { title: { zh: '亲子互动游戏', en: 'Family Games' }, prompt: { zh: '帮我设计 10 个亲子互动游戏，适合周末在家玩，包含角色扮演、寻宝游戏、记忆挑战，注明适合年龄和所需材料', en: 'Design 10 family games for weekends: role play, treasure hunts, memory challenges, with age range and materials' } },
          { title: { zh: '节日手工', en: 'Holiday Crafts' }, prompt: { zh: '帮我设计一套节日主题手工活动（春节、元宵、中秋、圣诞），每个节日 2-3 个手工项目，配文化知识和制作步骤', en: 'Design holiday crafts (New Year, Lantern Festival, Mid-Autumn, Christmas), 2-3 projects each with cultural knowledge' } },
        ],
      },
    ],
  },
};
