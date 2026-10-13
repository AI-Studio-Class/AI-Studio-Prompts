// Twenty GPT Image scenes packed in five 2x2 raster atlases.
const defs = [
 ['forest','林间营地','FOREST CAMP',[[210,280],[470,220],[690,330]],[450,550],[450,410]],
 ['library','藏书回廊','THE LIBRARY',[[225,235],[460,330],[690,225]],[170,555],[450,470]],
 ['observatory','观星高塔','STAR OBSERVATORY',[[290,335],[450,200],[640,355]],[450,565],[450,440]],
 ['river','溪谷木桥','RIVER CROSSING',[[200,240],[440,315],[700,200]],[180,550],[450,445]],
 ['desert','秘境遗迹','ANCIENT RUINS',[[190,315],[475,200],[705,320]],[690,550],[450,455]],
 ['clouds','云端花园','SKY GARDENS',[[190,235],[460,300],[710,220]],[450,570],[450,450]],
 ['workshop','齿轮工坊','THE WORKSHOP',[[230,230],[460,285],[690,245]],[240,560],[460,460]],
 ['harbor','海港灯塔','LIGHTHOUSE BAY',[[180,280],[455,220],[715,350]],[440,550],[450,425]],
 ['cavern','水晶洞窟','CRYSTAL CAVERN',[[220,330],[485,210],[725,300]],[300,560],[450,440]],
 ['canyon','悬崖索道','CANYON TRAILS',[[180,235],[470,305],[725,220]],[680,550],[480,455]],
 ['snow','雪山营站','SNOW RIDGE',[[205,315],[455,215],[675,300]],[455,570],[460,435]],
 ['bamboo','竹林小径','BAMBOO WALK',[[220,245],[505,220],[690,350]],[190,560],[450,430]],
 ['town','古城街巷','OLD TOWN',[[205,225],[450,330],[700,215]],[700,550],[450,460]],
 ['volcano','火山前哨','VOLCANO OUTPOST',[[195,335],[450,230],[710,325]],[440,570],[450,465]],
 ['lake','湖心浮岛','LAKE ISLANDS',[[205,280],[450,195],[710,280]],[450,555],[450,425]],
 ['greenhouse','玻璃温室','GLASS GARDEN',[[210,275],[475,230],[700,330]],[240,550],[470,445]],
 ['railway','列车月台','THE RAILWAY',[[180,245],[450,280],[730,235]],[180,550],[450,450]],
 ['clock','钟楼广场','CLOCK PLAZA',[[240,330],[450,205],[660,330]],[660,555],[450,440]],
 ['windmill','风车田野','WINDMILL FIELDS',[[210,260],[465,320],[700,245]],[440,560],[450,450]],
 ['launch','启航码头','DEPARTURE DOCK',[[225,315],[465,235],[700,320]],[460,575],[465,440]],
];
export const MAP_SCENES=defs.map(([id,name,english,targets,start,junction],index)=>({id,name,english,targets,start,junction,index,atlas:`./assets/scenes/atlas-${Math.floor(index/4)+1}.png`,cell:index%4}));
export const validMapDeck=deck=>Array.isArray(deck)&&deck.length===20&&new Set(deck).size===20&&deck.every(id=>MAP_SCENES.some(s=>s.id===id));
export function createMapDeck(){
 const ids=MAP_SCENES.map(s=>s.id);
 for(let i=ids.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 return ids;
}
export const getScene=id=>MAP_SCENES.find(s=>s.id===id)||MAP_SCENES[0];
