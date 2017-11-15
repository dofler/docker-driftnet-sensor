### Alpine Driftnet Builder Image ###
FROM alpine:3.6 as builder

# Install the needed dependencies to build driftnet
RUN apk -U add --no-cache git build-base libpcap-dev

# Download the dldewolf fork of driftnet.  We specifically want this version
# as it supports PNG files.
RUN git clone https://github.com/bldewolf/driftnet.git /driftnet

# We will need to make some modifications to the makefile so that we don't attempt
# to build with GTK.  As we won't have any kind of a GUI to interface to, its quite
# silly to add all of that complexity.  Once the modifications are complete, we will
# then build driftnet.
WORKDIR /driftnet
RUN sed -i 's/#CFLAGS += -DNO_DISPLAY_WINDOW/CFLAGS += -DNO_DISPLAY_WINDOW/g' Makefile
RUN sed -i 's/CFLAGS  += `pkg-config --cflags gtk+-2.0` `pkg-config --cflags libpng`//g' Makefile
RUN sed -i 's/LDLIBS  += -ljpeg -lgif `pkg-config --libs gtk+-2.0` `pkg-config --libs libpng`//g' Makefile
RUN make


### Dofler Driftnet Image ###
FROM node:9.1-alpine
ENV MONITOR_INTERFACE ""
ENV IMAGE_PATH "/images"
ENV DOFLER_ADDRESS ""

# install the dependencies from apk, pull in driftnet from the builder image,
# and then pull in the parser code.
RUN apk -U add --no-cache libpcap
COPY --from=builder /driftnet/driftnet /usr/bin/
COPY app /opt/app

# Install the needed dependencies from NPM
WORKDIR /opt/app
RUN npm install .

VOLUME /images

CMD ["node", "/opt/app/index.js"]