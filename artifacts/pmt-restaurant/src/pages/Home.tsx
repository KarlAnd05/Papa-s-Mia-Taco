import React from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { groupMenu, useMenu, usePublicSettings } from "@/hooks/useMenu";
import { menuPrice } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import { BoostBox, PapelPicadoBorder, ScallopedEdge, SectionHeading, WaveDivider } from "@/components/site/decor";
import { SiteNavbar } from "@/components/site/SiteNavbar";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LoadError } from "@/components/site/form";

const SECTION_IMAGES: Record<string, { src: string, border: string }> = {
  "Appetizers": { src: "/images/appetizers.jpg", border: "6px solid #F8F5EF" },
  "Tacos": { src: "/images/tacos.jpg", border: "6px solid #0F5D2F" },
  "Birria Pulled Beef": { src: "/images/birria.jpg", border: "6px solid #F4AA1C" },
  "Burritos": { src: "/images/burritos.jpg", border: "6px solid #A71F29" },
  "Burrito Bowls": { src: "/images/burrito-bowl.jpg", border: "6px solid #F4AA1C" },
  "Salads & Shakers": { src: "/images/salads.jpg", border: "6px solid #0F5D2F" },
  "Quesadillas": { src: "/images/quesadillas.jpg", border: "6px solid #A71F29" },
  "The Taco Bar": { src: "/images/taco-bar.jpg", border: "6px solid #F4AA1C" },
  "Dessert": { src: "/images/churros.jpg", border: "6px solid #A71F29" },
};

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className={`relative flex flex-col ${item.description || item.note ? "mb-6" : "mb-2"}`}>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <h4 className="text-[1rem] font-bold text-[#222222] min-w-0">
          {item.name}
          {item.isNew && (
            <span className="inline-block align-[2px] ml-2 px-1.5 py-0.5 text-[9px] leading-none uppercase tracking-wider font-bold bg-[#A71F29] text-white rounded-sm">
              New
            </span>
          )}
        </h4>
        <div className="flex-1 min-w-4 border-b-[2px] border-dotted border-[#222222]/20 mx-1 opacity-50 relative top-[-4px]"></div>
        <span className="text-[1rem] font-extrabold text-[#0F5D2F] whitespace-nowrap">
          {menuPrice(item.price)}
        </span>
      </div>
      
      {item.description && (
        <p className="text-[#555555] text-[0.85rem] leading-relaxed font-normal mb-1">
          {item.description}
        </p>
      )}
      
      {item.note && (
        <p className="text-[0.75rem] font-medium text-[#0F5D2F] italic tracking-wide">
          {item.note}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const { data: items, isLoading, isError, isFetching, refetch } = useMenu();
  const location = usePublicSettings().data?.restaurant.location;
  const menuData = groupMenu(items ?? [], { availableOnly: true });
  const sectionsWithImages = menuData.filter(s => s.category !== 'Dips & Sides' && s.category !== 'Drinks' && s.category !== 'The Taco Bar');
  const theTacoBar = menuData.find(s => s.category === 'The Taco Bar');
  const dipsAndSides = menuData.find(s => s.category === 'Dips & Sides');
  const drinks = menuData.find(s => s.category === 'Drinks');

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#222222] font-sans selection:bg-[#0F5D2F] selection:text-white">
      {/* Top Border */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <PapelPicadoBorder />
      </div>

      {/* Navbar */}
      <SiteNavbar variant="overlay" />

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-28 pb-10 overflow-hidden bg-[#222]">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 scale-105"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        />
        {/* Dark green gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0F5D2F]/80 via-[#0F5D2F]/40 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#111]/60 via-transparent to-transparent" />
        
        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full flex flex-col items-center text-center mt-4 md:mt-8">
          <img
            src={`${import.meta.env.BASE_URL}logo.webp`}
            alt=""
            width={480}
            height={447}
            className="w-32 md:w-44 h-auto mb-5 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          />
          <div className="inline-block mb-4 text-[#F4AA1C] text-sm font-bold tracking-[0.2em] uppercase">
            Est. 2024{location ? ` · ${location}` : ""}
          </div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[7rem] leading-[1] font-black tracking-tight text-white mb-6 italic drop-shadow-lg">
            Authentic Mexican <br /> Street Food
          </h1>
          <p className="text-xl md:text-2xl text-[#F8F5EF] max-w-2xl font-light leading-relaxed mb-10 drop-shadow-md">
            Made with love, served with fire.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/order"
              className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white bg-[#0F5D2F] rounded-full transition-transform hover:scale-[1.05] active:scale-[0.98] shadow-xl"
            >
              <span className="relative z-10 tracking-widest uppercase text-[0.9rem]">Order Online</span>
            </Link>
            <Link
              href="/reservations"
              className="inline-flex items-center justify-center px-10 py-5 font-bold text-[#222] bg-[#F4AA1C] rounded-full transition-transform hover:scale-[1.05] active:scale-[0.98] shadow-xl"
            >
              <span className="tracking-widest uppercase text-[0.9rem]">Book a Table</span>
            </Link>
          </div>
          <a href="#menu" className="mt-6 text-white/90 hover:text-white text-sm font-semibold uppercase tracking-widest underline-offset-4 hover:underline">
            See our menu
          </a>
        </div>
      </section>

      {/* Inverted Papel Picado */}
      <div className="-mt-[40px] relative z-30">
        <PapelPicadoBorder invert />
      </div>

      {/* Menu Section */}
      <section id="menu" className="relative z-20 bg-[#F8F5EF] pt-20 pb-32 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          {isError && !items && (
            <div className="max-w-xl mx-auto px-6 py-16">
              <LoadError what="the menu" onRetry={() => refetch()} retrying={isFetching} />
            </div>
          )}
          {isLoading && (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F5D2F]" />
            </div>
          )}

          {sectionsWithImages.map((section, idx) => {
            const isEven = idx % 2 === 0;
            const imgData = SECTION_IMAGES[section.category];
            
            return (
              <React.Fragment key={section.category}>
                <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 px-6 py-20`}>
                  
                  {/* Image Column (categories without a photo use the full width) */}
                  {imgData && (
                    <div className="w-full md:w-1/2 flex justify-center">
                      <div className="relative w-full max-w-md aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl" style={{ border: imgData.border }}>
                        <img src={imgData.src} alt={section.category} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Content Column */}
                  <div className={imgData ? "w-full md:w-1/2" : "w-full md:w-2/3 mx-auto"}>
                    <SectionHeading text={section.category} index={idx} />
                    
                    {section.callout && (
                      <div className="bg-[#A71F29] text-white text-center text-sm font-bold tracking-wider uppercase px-4 py-2 rounded-lg mb-8 shadow-md">
                        {section.callout}
                      </div>
                    )}

                    {section.boost && (
                      <BoostBox text={section.boost.replace(/^.*?Boost:\s*/i, '')} />
                    )}

                    <div className="mt-8 flex flex-col gap-2">
                      {section.items.map((item) => (
                        <MenuItemCard key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider between sections (don't show after the last one before Taco Bar) */}
                {idx < sectionsWithImages.length - 1 && (
                  idx % 2 === 0 
                    ? <WaveDivider color="#0F5D2F" /> 
                    : <ScallopedEdge bg="#F8F5EF" fill="#A71F29" />
                )}
              </React.Fragment>
            );
          })}
          
        </div>
      </section>

      <WaveDivider color="#0F5D2F" flip />

      {/* The Taco Bar Section */}
      {theTacoBar && (
        <section className="bg-[#0F5D2F] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="w-full md:w-1/2 text-white">
                <h2 className="font-serif text-5xl md:text-7xl font-black italic mb-6 text-[#F4AA1C]">
                  {theTacoBar.category}
                </h2>
                {theTacoBar.items.map(item => (
                  <div key={item.name} className="mb-8">
                    <h3 className="text-2xl font-bold mb-4">{item.name}</h3>
                    <p className="text-lg text-white/90 leading-relaxed mb-8">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <span className="text-6xl font-black text-[#F4AA1C] leading-none">{menuPrice(item.price)}</span>
                      {item.note && (
                        <span className="text-sm sm:text-base font-bold bg-[#A71F29] px-4 py-2 rounded-full uppercase tracking-wide">{item.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full md:w-1/2">
                <div className="w-full max-w-md mx-auto rounded-[32px] overflow-hidden shadow-2xl aspect-[4/5]" style={{ border: '6px solid #F4AA1C' }}>
                  <img src={SECTION_IMAGES['The Taco Bar']?.src} alt="The Taco Bar" loading="lazy" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <ScallopedEdge bg="#0F5D2F" fill="#F8F5EF" />

      {/* Dips & Sides + Drinks */}
      <section className="py-24 bg-[#F8F5EF]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 md:gap-24">
            
            {/* Dips & Sides */}
            {dipsAndSides && (
              <div className="flex-1">
                <div className="text-center mb-10">
                  <h2 className="font-serif text-4xl font-bold text-[#A71F29] italic mb-4">{dipsAndSides.category}</h2>
                  <svg viewBox="0 0 100 8" style={{ width: 100, height: 8, display: 'block', margin: '0 auto' }}>
                    <polyline points="0,6 10,2 20,6 30,2 40,6 50,2 60,6 70,2 80,6 90,2 100,6" fill="none" stroke="#A71F29" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex flex-col gap-4">
                  {dipsAndSides.items.map(item => (
                    <MenuItemCard key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Drinks */}
            {drinks && (
              <div className="flex-1">
                <div className="text-center mb-10">
                  <h2 className="font-serif text-4xl font-bold text-[#F4AA1C] italic mb-4">{drinks.category}</h2>
                  <svg viewBox="0 0 100 8" style={{ width: 100, height: 8, display: 'block', margin: '0 auto' }}>
                    <polyline points="0,6 10,2 20,6 30,2 40,6 50,2 60,6 70,2 80,6 90,2 100,6" fill="none" stroke="#F4AA1C" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex flex-col gap-4">
                  {drinks.items.map(item => (
                    <MenuItemCard key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-16 py-32 bg-[#F8F5EF] relative border-t-[8px] border-[#0F5D2F] border-dashed">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-6xl font-black text-[#0F5D2F] mb-8 italic">
            Family-Made. <br /> Street-Fresh.
          </h2>
          <p className="text-xl md:text-2xl text-[#222222] font-medium leading-relaxed max-w-2xl mx-auto mb-16">
            A vibrant, modern taqueria{location ? ` in ${location}` : ""}. Real street tacos, zero compromises. We bring the heat, the flavor, and the energy. Come hungry.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#F4AA1C]">
              <div className="text-4xl mb-4">🌮</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">15 Tacos / Taco Bar</h3>
              <p className="text-sm text-[#555]">Perfect for sharing, built exactly your way.</p>
            </div>
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#A71F29]">
              <div className="text-4xl mb-4">🥑</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">Fresh Daily</h3>
              <p className="text-sm text-[#555]">Guac mashed fresh, salsa made from scratch.</p>
            </div>
            <div className="bg-white p-8 rounded-[24px] shadow-lg border-2 border-[#0F5D2F]">
              <div className="text-4xl mb-4">🌶️</div>
              <h3 className="font-bold text-lg mb-2 uppercase tracking-wide">Made in Lebanon</h3>
              <p className="text-sm text-[#555]">Local love meets authentic Mexican street food.</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
