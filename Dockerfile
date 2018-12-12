FROM nginx:stable-alpine

COPY ./dist /usr/app/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
