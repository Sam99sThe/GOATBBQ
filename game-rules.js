export const nauseaLevels=['肚子怪怪的','胃裡有小象散步','腸胃開始開會','肚皮偷偷打鼓','胃酸試探性敲門','肚子發出離職預告','腸道正在塞車','胃裡的肉開始抗議','噁心感偷偷加班','肚皮內建洗衣機','胃酸準備搭電梯','肚子宣布緊急動員','腸胃上演災難電影','鼻子聞到人生跑馬燈','胃裡海嘯正在暖身','全身細胞尋找廁所','排山倒海退一步海闊天空進一步内牛滿面惡心感'];
export const angerLevels=['微微發怒','眉毛開始有意見','鼻孔吹出不滿','耳朵拒絕營業','心中點燃小炭火','象牙磨出火藥味','耐心正式請假','怒氣正在加熱','鼻子捲起抗議旗','內心烤爐全面失控','腦門冒出虛擬蒸氣','暴躁大象準備開嗆','方圓十里感到壓力','怒火突破大氣層','火山口正在倒數','宇宙級怒氣只差一口','火山霹靂無敵可怕大象一觸即發憤怒'];
export function applyMeal(p,sides){const burnt=Math.max(...sides)>145,raw=Math.min(...sides)<65;const expelled=(burnt&&p.anger>=17)||(raw&&p.nausea>=17);if(burnt)p.anger=Math.min(17,p.anger+1);if(raw)p.nausea=Math.min(17,p.nausea+1);if(!burnt&&!raw){p.anger=Math.max(0,p.anger-1);p.nausea=Math.max(0,p.nausea-1);}return expelled;}
export function health(p){return {nausea:p.nausea,anger:p.anger,nauseaText:p.nausea?nauseaLevels[Math.min(p.nausea,17)-1]:'',angerText:p.anger?angerLevels[Math.min(p.anger,17)-1]:''};}

