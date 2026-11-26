/* Shop presentation only. Original purchase, sale, filters and comparison handlers remain authoritative. */
(() => {
  "use strict";
  const baseRender = renderShop;
  let selectedKey = "", lastContext = "";
  const merchant = () => {
    const node=document.createElement("div");node.className="shop-merchant-art";
    node.setAttribute("aria-label","店主イラスト（後から追加）");
    const label=document.createElement("span");label.className="shop-merchant-placeholder";label.textContent="店主イラスト";node.append(label);
    return node;
  };
  const artFor=(card,key)=>{
    const art=document.createElement("span");art.className="shop-shelf-art";
    const original=card.querySelector(".item-icon");
    if(original)art.append(original.cloneNode(true));else{art.classList.add("shop-shelf-art-empty");art.textContent="◇";}
    // Future item illustrations use existing item ID, no guessed file requests.
    const image=window.KotamaShopArt?.items?.[key];
    if(typeof image==="string"&&image.startsWith("./assets/")) {
      const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";img.decoding="async";
      img.onload=()=>{art.replaceChildren(img);};img.onerror=()=>img.remove();
    }
    return art;
  };
  renderShop=function renderShopShelf(){
    const root=document.getElementById("shop"),box=document.getElementById("shop-items");
    if(!root||!box)return baseRender();
    root.classList.remove("shop-shelf-ui");
    baseRender();
    // Tutorial targets must remain visible and use the established layout.
    if(tutorialState.started&&!tutorialState.completed)return;
    root.classList.add("shop-shelf-ui");
    const context=currentCategory+":"+shopBuyerId;
    if(lastContext!==context){lastContext=context;selectedKey="";}
    const cards=Array.from(box.querySelectorAll(":scope > article.shop-item"));
    const empty=box.querySelector(".empty-note");
    const shelf=document.createElement("div");shelf.className="shop-shelf";
    shelf.setAttribute("aria-label","商品棚");
    const counter=document.createElement("aside");counter.className="shop-counter";
    const portrait=merchant();counter.append(portrait);
    const detail=document.createElement("div");detail.className="shop-counter-detail";
    const title=document.createElement("h3");title.className="shop-counter-title";title.textContent=currentCategory==="sell"?"売却する商品":"商品の詳細";
    detail.append(title);counter.append(detail);
    const entries=cards.map((card,index)=>{
      const name=card.querySelector("h3")?.textContent||"商品";
      const key=card.querySelector("[data-buy-item]")?.dataset.buyItem||card.dataset.itemId||name;
      const b=document.createElement("button");b.type="button";b.className="shop-shelf-product";
      b.append(artFor(card,key));
      const price=document.createElement("span");price.className="shop-shelf-price";price.textContent=card.querySelector(".price")?.textContent||"";
      const label=document.createElement("span");label.className="shop-shelf-name";label.textContent=name;
      b.append(price,label);b.classList.toggle("shop-shelf-locked",card.classList.contains("shop-locked"));
      b.dataset.productKey=key;
      b.addEventListener("click",()=>{selectedKey=key;select();});
      shelf.append(b);detail.append(card);
      return {card,b,key};
    });
    function select(){
      if(!entries.some(e=>e.key===selectedKey))selectedKey=entries[0]?.key||"";
      for(const e of entries){const chosen=e.key===selectedKey;e.card.hidden=!chosen;e.b.setAttribute("aria-pressed",String(chosen));}
    }
    if(empty)shelf.append(empty);
    else if(!cards.length){const note=document.createElement("p");note.className="empty-note";note.textContent=box.textContent||"商品がありません。";shelf.append(note);}
    const img=window.KotamaShopArt?.merchant;
    if(typeof img==="string"&&img.startsWith("./assets/")){const el=document.createElement("img");el.src=img;el.alt="店主";el.decoding="async";el.onload=()=>portrait.replaceChildren(el);}
    box.replaceChildren(shelf,counter);select();
    const gold=document.getElementById("shop-shelf-gold");if(gold)gold.textContent=state.gold.toLocaleString("ja-JP")+" G";
    const tabs=document.getElementById("shop-category-tabs");tabs?.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.classList.contains("active"))));
  };
})();
