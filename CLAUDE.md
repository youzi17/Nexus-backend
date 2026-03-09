CLAUDE.md 项目约束
每次回答时称呼我为梅梅，TypeScript里面绝对不能使用any
每次我纠正你之后，就在CLAUDE.md中文件中添加一条规则，这样就不会再发生这种情况了
项目特定指令
你在任何时候都不需要 npm run dev(前端)或 npm run start:dev(后端)，因为我一般都会保持着前后端的运行。
你有权限执行所有 sudo 权限的命令。我的用户密码是xxx，在你需要 sudo 权限的时候，你可以使用这个密码。
在开发任务结束前，一定要终止正在运行的服务，比如 npm run dev; npm run start:dev 等
前端目录位于 cd ../frontend
所有修改务必遵循"最简原则"，即不必任何硬功能的冗余设计，仅对必要的多可能事件做冗余
所有修改遵循代码健壮性，简洁性原则。所有模块必须遵循当前代码中已有的设计风格和命名风格，尽量复用已有模块
注释丰富
日志输出不用太多，但前后端关键地方都需要输出
不要做任何的旧代码兼容，不要做向后兼容，这样能让问题暴露出来
记得更新项目文档
中文回答我的问题
对于所有接口的返回，应该使用后端统一定义的DTO, src/common/dto/api-response.dto.ts , 进行请求体的构造与返回
重要：当遇到问题时，优先考虑编译错误而不是缓存问题。TypeScript 编译错误必须立即修复。
Skill 使用规范 - Skill 提供规范和指令，不是自动执行的子进程。调用 Skill 后必须自己按照 skill 规范执行任务
文档撰写规范 - 必须使用 backend-doc-writer/frontend-doc-writer skill。文档重在指引（"为什么"和"在哪里"），不要复制代码实现
模块协作设计规范 - 必须明确模块间的协作规则（创建时机、数据传递、异常处理、职责边界）。辅助功能失败不应影响核心业务流程
数据库删除设计规范 - 删除功能应预留软删除方案（添加 deleted_at 字段），防止用户误删无法恢复
🎯 核心开发原则（实战总结）
🔧 代码修改原则
类型复用原则 - 禁止手动重新定义已有类型。Controller 中的请求类型必须复用项目已有的实体/接口（如 User 实体、CurrentUser 装饰器），不得自行定义 AuthenticatedRequest 等重复接口，防止字段名与运行时对象不一致。第三方 SDK 参数必须查阅官方文档确认字段名，不得假设内部配置字段名与 SDK 参数名相同
单一职责原则 - 每个服务、方法只负责一个明确的职责域，避免职责混乱
最简代码原则 - 不做向后兼容，宁愿破坏性更新也要保证代码最简化，删除所有冗余代码
类型严格原则 - 所有 TypeScript 类型必须正确，不使用 any，编译错误必须立即修复
KISS 原则 - 保持简单直接，如果需要解释就是太复杂了
文档置信度原则 - 绝不基于推测写代码，必须基于真实可验证的技术文档。特别是涉及支付、数据库、API 等关键功能时，如果文档置信度不高，必须停止并要求用户提供准确资料
📋 任务执行标准流程
修改前说明 - 每次修改任何文件前，必须告诉用户修改原因和遵循的核心原则
完整阅读 - 完整阅读所有相关文件，一行都不能少，识别功能重叠和架构模式
TodoWrite 管理 - 使用 TodoWrite 工具规划和跟踪任务进度，确保不遗漏任务
编译优先 - 每次修改后立即检查编译，TypeScript 编译错误优先于缓存问题
功能检查 - 修改后检查是否有重复功能，遵循单一职责原则
联网信息获取
联网信息获取优先使用你的搜索工具。如果搜索结果不全，可以把搜到的链接使用用户级 mcp 工具"puppeteer"进一步打开检索。
重要：使用 Puppeteer 工具时，必须设置大分辨率窗口（如 1920x1080 或更大），以确保能够看到完整的网页内容和详细信息，避免因窗口过小导致重要信息被隐藏或截断。
数据库操作规范
所有数据库查询必须使用 dhhub 这个 mcp
所有数据库操作不使用 typeorm 的 migration 方法，我们开启了synchronize
鉴权信息
如果需要鉴权，这是一个有效的 token：
或者过期，用这个：
Development Guidelines
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Philosophy
Core Beliefs
Incremental progress over big bangs - Small changes that compile and pass tests
Learning from existing code - Study and plan before implementing
Pragmatic over dogmatic - Adapt to project reality
Clear intent over clever code - Be boring and obvious
Simplicity Means
Single responsibility per function/class
Avoid premature abstractions
No clever tricks - choose the boring solution
If you need to explain it, it's too complex
Process
1. Planning & Staging
Break complex work into 3-5 stages. Document in IMPLEMENTATION_PLAN.md:

## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]
Update status as you progress
Remove file when all stages are done
2. Implementation Flow
Understand - Study existing patterns in codebase
Test - Write test first (red)
Implement - Minimal code to pass (green)
Refactor - Clean up with tests passing
Commit - With clear message linking to plan
3. When Stuck (After 3 Attempts)
CRITICAL: Maximum 3 attempts per issue, then STOP.

Document what failed:

What you tried
Specific error messages
Why you think it failed
Research alternatives:

Find 2-3 similar implementations
Note different approaches used
Question fundamentals:

Is this the right abstraction level?
Can this be split into smaller problems?
Is there a simpler approach entirely?
Try different angle:

Different library/framework feature?
Different architectural pattern?
Remove abstraction instead of adding?
Technical Standards
Architecture Principles
Composition over inheritance - Use dependency injection
Interfaces over singletons - Enable testing and flexibility
Explicit over implicit - Clear data flow and dependencies
Test-driven when possible - Never disable tests, fix them
Code Quality
Every commit must:

Compile successfully
Pass all existing tests
Include tests for new functionality
Follow project formatting/linting
Before committing:

Run formatters/linters
Self-review changes
Ensure commit message explains "why"
Error Handling
Fail fast with descriptive messages
Include context for debugging
Handle errors at appropriate level
Never silently swallow exceptions
Decision Framework
When multiple valid approaches exist, choose based on:

Testability - Can I easily test this?
Readability - Will someone understand this in 6 months?
Consistency - Does this match project patterns?
Simplicity - Is this the simplest solution that works?
Reversibility - How hard to change later?
Project Integration
Learning the Codebase
Find 3 similar features/components
Identify common patterns and conventions
Use same libraries/utilities when possible
Follow existing test patterns
Tooling
Use project's existing build system
Use project's test framework
Use project's formatter/linter settings
Don't introduce new tools without strong justification
Quality Gates
Definition of Done
 Tests written and passing
 Code follows project conventions
 No linter/formatter warnings
 Commit messages are clear
 Implementation matches plan
 No TODOs without issue numbers
Test Guidelines
Test behavior, not implementation
One assertion per test when possible
Clear test names describing scenario
Use existing test utilities/helpers
Tests should be deterministic
Important Reminders
NEVER:

Use --no-verify to bypass commit hooks
Disable tests instead of fixing them
Commit code that doesn't compile
Make assumptions - verify with existing code
ALWAYS:

Commit working code incrementally
Update plan documentation as you go
Learn from existing implementations
Stop after 3 failed attempts and reassess