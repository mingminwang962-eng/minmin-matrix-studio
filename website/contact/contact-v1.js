document.querySelectorAll('[data-minmin-contact]').forEach(section=>{
  const button=section.querySelector('[data-mc-copy]'),input=section.querySelector('input'),status=section.querySelector('[role="status"]');
  button.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(input.value);status.textContent='已复制微信号，打开微信搜索添加。';}
    catch{input.focus();input.select();status.textContent='请选择并复制微信号。';}
  });
});
const contactDialog=document.getElementById('minmin-contact-dialog');
if(contactDialog){
  document.querySelector('[data-mc-open]').addEventListener('click',()=>contactDialog.showModal());
  contactDialog.querySelector('[data-mc-close]').addEventListener('click',()=>contactDialog.close());
  contactDialog.addEventListener('click',event=>{if(event.target===contactDialog)contactDialog.close();});
}
