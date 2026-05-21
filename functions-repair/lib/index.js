"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTeamMembersSoTFromIndex = void 0;
/**
 * 멤버 SoT 복구 Callable 전용 — 메인 functions 엔트리 10초 로드 타임아웃 회피
 * 배포: firebase deploy --only functions:repair
 */
var repairTeamMembersSoTCallable_1 = require("./src/repairTeamMembersSoTCallable");
Object.defineProperty(exports, "repairTeamMembersSoTFromIndex", { enumerable: true, get: function () { return repairTeamMembersSoTCallable_1.repairTeamMembersSoTFromIndex; } });
