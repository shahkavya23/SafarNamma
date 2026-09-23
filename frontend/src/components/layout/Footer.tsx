import React from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-[#070A0D] text-white pt-16 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              <img 
                src="/safarnamma-logo.png" 
                alt="SafarNamma" 
                className="h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300 brightness-110" 
              />
            </Link>
            <p className="text-[#94A3B8] text-sm leading-relaxed max-w-sm">
              Your next adventure is closer than you think. Discover hidden gems, scenic road trips, and like-minded travelers across Bengaluru and the Western Ghats.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#E2E8F0]">Discover</h3>
            <ul className="space-y-3">
              <li><Link to="/explore?category=waterfalls" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Waterfalls</Link></li>
              <li><Link to="/explore?category=treks" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Treks</Link></li>
              <li><Link to="/explore?category=lakes" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Lakes & Peaceful</Link></li>
              <li><Link to="/explore?category=cafes" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Cafes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#E2E8F0]">Community</h3>
            <ul className="space-y-3">
              <li><Link to="/groups" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Join a Group</Link></li>
              <li><Link to="/submit" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Submit a Place</Link></li>
              <li><Link to="/guidelines" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Safety Guidelines</Link></li>
              <li><Link to="/admin/login" className="text-[#94A3B8] hover:text-[#F59E0B] text-sm transition-colors">Admin Area</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-[#0D5C63]/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#94A3B8] text-sm">
            © {new Date().getFullYear()} SafarNamma. All rights reserved.
          </p>
          <p className="text-[#94A3B8] text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-[#F59E0B]" fill="currentColor" /> for travelers
          </p>
        </div>
      </div>
    </footer>
  );
};
