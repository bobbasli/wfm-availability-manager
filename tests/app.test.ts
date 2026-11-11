// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createApp } from 'vue';
import App from '../src/App.vue';
it('houdt de kalender en leesbare roosterrijen aanwezig zonder unavailable response',()=>{
  sessionStorage.clear();
  const root=document.createElement('div');document.body.appendChild(root);
  const app=createApp(App);app.mount(root);
  try{
    const add=[...root.querySelectorAll('button')].find(button=>button.textContent==='+ Tijdvak toevoegen');
    expect(add).toBeDefined();expect(add?.disabled).toBe(true);
    expect(root.textContent).toContain('Rooster onbekend');
  }finally{app.unmount();root.remove();}
});
