import React, { useState } from "react";

export const Login: React.FC<{ onSignup: () => void }> = ({ onSignup }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e3dbd3] px-4 font-sans text-[#4a4440]">
            {/* Main Card */}
            <div className="w-full max-w-[430px] h-[580px] rounded-[50px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] bg-[#f3f1e9] overflow-hidden flex flex-col relative">

                {/* Header - Top Cream Side */}
                <div className="pt-14 pb-20 text-center z-10">
                    <h1 className="text-[2.6rem] tracking-[0.25em] font-serif uppercase font-medium text-[#6b6661]">
                        NOTESLITE
                    </h1>
                </div>

                {/* Body - Pinkish Gradient Side with Eliptical Curve */}
                <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-b from-[#fce4ec] via-[#f8bbd0] to-[#f4a9a9] rounded-t-[120px_60px] flex flex-col items-center px-12 pt-16 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)]">

                    {/* Input Fields */}
                    <div className="w-full space-y-5">
                        <div className="relative group">
                            <input
                                type="email"
                                placeholder="ENTER EMAIL"
                                className="w-full py-4 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-sm tracking-widest font-semibold"
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                placeholder="ENTER PASSWORD"
                                className="w-full py-4 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-sm tracking-widest font-semibold"
                            />
                        </div>

                        {/* Login Button */}
                        <button
                            type="button"
                            className="w-full py-3.5 rounded-full bg-gradient-to-b from-[#eeb4a8] to-[#d58b7c] text-white tracking-[0.2em] shadow-[0_4px_15px_rgba(213,139,124,0.4)] hover:shadow-[0_6px_20px_rgba(213,139,124,0.5)] active:scale-[0.98] transition-all font-bold text-sm uppercase"
                        >
                            Log In
                        </button>
                    </div>

                    <div className="my-5 text-[#7a6f6b] font-bold tracking-[0.2em] text-xs uppercase opacity-80">Or</div>

                    {/* Social/Signup Buttons */}
                    <div className="w-full space-y-4">
                        <button
                            type="button"
                            className="w-full py-3.5 rounded-full bg-[#e6d9d4] text-[#6d6461] shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:bg-[#dfd0ca] transition-colors tracking-[0.1em] text-xs font-bold uppercase border border-white/40"
                        >
                            Log In Using Google
                        </button>

                        <button
                            type="button"
                            onClick={onSignup}
                            className="w-full py-3.5 rounded-full bg-[#e6d9d4] text-[#6d6461] shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:bg-[#dfd0ca] transition-colors tracking-[0.1em] text-xs font-bold uppercase border border-white/40"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Signup: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e3dbd3] px-4 font-sans text-[#4a4440]">
            {/* Main Card */}
            <div className="w-full max-w-[430px] h-[580px] rounded-[50px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] bg-[#f3f1e9] overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="pt-14 pb-20 text-center z-10">
                    <h1 className="text-[2.6rem] tracking-[0.25em] font-serif uppercase font-medium text-[#6b6661]">
                        NOTESLITE
                    </h1>
                </div>

                {/* Body */}
                <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-b from-[#fce4ec] via-[#f8bbd0] to-[#f4a9a9] rounded-t-[120px_60px] flex flex-col items-center px-12 pt-12 shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)]">

                    <h2 className="text-[#6d6461] mb-5 tracking-[0.4em] font-bold text-xs uppercase opacity-90">Sign-Up</h2>

                    <div className="w-full space-y-3.5">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="ENTER NAME"
                                className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="email"
                                placeholder="ENTER EMAIL"
                                className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="password"
                                placeholder="ENTER PASSWORD"
                                className="w-full py-3.5 px-6 rounded-full bg-[#c6bcb8] shadow-[inset_0_4px_6px_rgba(0,0,0,0.25)] text-center placeholder-[#6d6461] text-[#4a4440] outline-none border border-black/5 focus:bg-[#b0a5a0] transition-colors uppercase text-xs tracking-widest font-semibold"
                            />
                        </div>

                        <button
                            type="button"
                            className="w-full py-3 rounded-full bg-gradient-to-b from-[#eeb4a8] to-[#d58b7c] text-white tracking-[0.2em] shadow-[0_4px_15px_rgba(213,139,124,0.4)] hover:shadow-[0_6px_20px_rgba(213,139,124,0.5)] active:scale-[0.98] transition-all font-bold text-xs uppercase mt-2"
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Back Arrow */}
                    <button
                        onClick={onLogin}
                        className="absolute bottom-10 left-10 text-3xl text-[#6d6461] hover:scale-110 active:scale-95 transition-all opacity-70"
                    >
                        ←
                    </button>
                </div>
            </div>
        </div>
    );
};

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);

    return isLogin ? (
        <Login onSignup={() => setIsLogin(false)} />
    ) : (
        <Signup onLogin={() => setIsLogin(true)} />
    );
};

export default Auth;
