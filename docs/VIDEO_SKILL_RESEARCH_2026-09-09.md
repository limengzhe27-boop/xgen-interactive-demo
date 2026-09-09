# 开源导演 Skill 调研与本项目取舍

日期：2026-09-09。范围：公开仓库的相关 Skill 正文、指定参考文件及许可证；不是整仓安装，也未执行外部脚本。用户暂停视频测试，本轮没有视频、图片、配音模型调用。

## 查到且采用的思路

| 来源（固定修订） | 许可 | 本次吸收 | 没有照搬 |
| --- | --- | --- | --- |
| [DirectorSKILL / cinematic-director](https://github.com/wuwangzhang1216/DirectorSKILL/blob/c65ae0d14457053efb1e354c7e7f7e120d97fad1/SKILL.md)，其 blocking-and-staging 与 video-prompt-template | [MIT](https://github.com/wuwangzhang1216/DirectorSKILL/blob/c65ae0d14457053efb1e354c7e7f7e120d97fad1/LICENSE) | 先人物调度后摄影；起点、过程、终点；图生视频聚焦运动；首尾态保持 | 不采信通用动作“成功率”等级为我们的模型实测；不机械把接触动作删掉；不强制3–5秒或自动重试 |
| [ai-film-skills / ai-storyboard-director](https://github.com/62656456/ai-film-skills/blob/678edc06d3318c1516f6eb73503f740427fdd831/skills/ai-storyboard-director/SKILL.md) | [Apache-2.0](https://github.com/62656456/ai-film-skills/blob/678edc06d3318c1516f6eb73503f740427fdd831/LICENSE) | 因果→演员走位→镜头；首帧可见范围；身体与环境响应；不等长分时；人读分镜与正式提示分层 | 不安装其整套复杂生产工作流，不强制每镜六大模块长篇输出，不因参考中的指令自动执行脚本 |
| [ai-film-skills / produce-ai-video](https://github.com/62656456/ai-film-skills/blob/678edc06d3318c1516f6eb73503f740427fdd831/skills/produce-ai-video/SKILL.md) | 同上；同时检查 [第三方声明](https://github.com/62656456/ai-film-skills/blob/678edc06d3318c1516f6eb73503f740427fdd831/THIRD_PARTY_NOTICES.md) | 剪辑镜头与一次模型生成片段分开；持久记录首尾状态，续镜不随意重写锁定内容 | 不采用固定每段7–8镜，不启动其视频生产、下载、重试或付费流程 |

这些是方法参考，不是经过本项目实测的质量背书。项目新增规则、样例和校验代码为针对当前需求的独立编写，没有打包外部模板/源码或冒充其作者。将来若直接分发第三方内容，应随复制部分保留对应许可与归属，不能只留下本表。

## 这次真正改变了什么

此前的v2解决了“发生什么、为什么发生、要说什么”，仍没有充分写“六秒里演员和镜头具体怎样演”。现在补上逐镜表演层：

- `shot-performance.md`：空间/首帧、非均匀动作节拍、摄影响应、尾态、声音、风险和参考素材条件。
- `prologue-first-person.direction.json`：同一28秒修仙故事的五段完整细化，不改旧故事文件，便于对比。
- `lib/prologue-direction.ts`：表演层必须覆盖每镜；检查节拍时间与必要字段；输出文生视觉、图生运动、导演时间表及分开的声轨。
- `prepare-prologue.mjs --direction`：本地入口；仍不联网、不扣费、不授权提交。`--story`只检查故事草案。
- `scene-direction-4`：网站5秒互动片段提示也加入起势、反应、落点与运镜动机的精简要求；这不是把完整序章导演流水线接进网页，也不增加音频生成能力。

## 不能由这些改动证明的事

时间戳是导演目标，不保证模型逐秒服从；动作与镜头指令越多也可能越不稳定。结构检查无法判断提示是否有戏、手部接触是否真实、场景是否连续、音画是否可懂。特别是金链绕腕仍是高风险段。真实参考图检查、模型参数核实、收费试拍、完整视听验收都保持待办，等待用户的新指令。

后续视频必须有声音。本轮只保留并细化对白与环境/动作声计划，没有合成音频，不能称有声新片已完成。
