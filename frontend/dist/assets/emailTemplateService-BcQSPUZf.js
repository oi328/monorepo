import{b as e}from"./index-Djxv-fhn.js";const i=async()=>(await e.get("/api/email-templates"))?.data||[],l=async a=>(await e.post("/api/email-templates",a))?.data,m=async(a,t)=>(await e.put(`/api/email-templates/${a}`,t))?.data,p=async a=>(await e.delete(`/api/email-templates/${a}`))?.data;export{l as c,p as d,i as g,m as u};
//# sourceMappingURL=emailTemplateService-BcQSPUZf.js.map
