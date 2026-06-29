# AlphaCannon
gcloud compute ssh freaky-virtual-machine --zone=europe-west9-c
yarn install
yarn build
pm2 start server.js --name "alphacannon"
sudo cp -r dist/* /var/www/html/

Restart: pm2 restart alphacannon
Stop: pm2 delete alphacannon

nginx config: /etc/nginx/sites-available/default
