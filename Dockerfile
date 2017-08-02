FROM node:6.10-alpine

ENV PROJECT_PATH /driftnet
ENV MONITOR_INTERFACE ""
ENV IMAGE_PATH "/images"
ENV DOFLER_ADDRESS ""

COPY app /app

RUN apk add --update --no-cache git build-base libpcap libpcap-dev                                              \
    && git clone https://github.com/bldewolf/driftnet.git /driftnet                                             \
    && cd /driftnet                                                                                             \
    && sed -i 's/#CFLAGS += -DNO_DISPLAY_WINDOW/CFLAGS += -DNO_DISPLAY_WINDOW/g' Makefile                       \
    && sed -i 's/CFLAGS  += `pkg-config --cflags gtk+-2.0` `pkg-config --cflags libpng`//g' Makefile            \
    && sed -i 's/LDLIBS  += -ljpeg -lgif `pkg-config --libs gtk+-2.0` `pkg-config --libs libpng`//g' Makefile   \
    && make                                                                                                     \
    && cp driftnet /usr/bin                                                                                     \
    && cd /app                                                                                                  \
    && npm install                                                                                              \
    && mkdir -p /images                                                                                         \
    && rm -rf /driftnet                                                                                         \
    && apk del --no-cache git build-base

VOLUME /images

CMD ["node", "/app/index.js"]