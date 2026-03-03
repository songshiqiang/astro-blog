import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay, Navigation, Pagination } from "swiper/modules";

// 引入 Swiper 样式
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";

import getImageUrl from "@/lib/utils/getImageUrl";

interface ScreenshotCarouselProps {
  images: string[];
  title: string;
}

const ScreenshotCarousel: React.FC<ScreenshotCarouselProps> = ({ images, title }) => {
  return (
    <div className="screenshot-carousel-container py-10">
      <Swiper
        effect={"coverflow"}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={"auto"}
        initialSlide={Math.floor(images.length / 2)}
        loop={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        coverflowEffect={{
          rotate: 0,
          stretch: 80,
          depth: 200,
          modifier: 1,
          slideShadows: false,
          scale: 0.85,
        }}
        pagination={{
          clickable: true,
        }}
        modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
        className="screenshot-swiper"
      >
        {images.map((img, index) => (
          <SwiperSlide key={index} className="screenshot-slide w-[240px]! md:w-[300px]!">
            <div className="relative group overflow-hidden rounded-4xl shadow-2xl">
              <img
                src={getImageUrl(img)}
                alt={`${title} screenshot ${index + 1}`}
                className="w-full h-auto object-cover rounded-4xl"
              />
              <div className="absolute inset-0 pointer-events-none bg-linear-to-tr from-white/10 to-transparent opacity-50"></div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style>{`
        .screenshot-carousel-container {
          width: 100%;
          overflow: hidden;
        }
        .screenshot-swiper {
          width: 100%;
          padding-top: 20px;
          padding-bottom: 50px;
        }
        .screenshot-slide {
          background-position: center;
          background-size: cover;
          height: auto;
        }
      `}</style>
    </div>
  );
};

export default ScreenshotCarousel;
