import Mapbox from '@rnmapbox/maps';

// Public token (starts "pk."). This is meant to ship in the client, same as a
// Google Maps mobile SDK key — it is NOT the secret download token used to
// fetch the native SDK at build time (see app.config.js for that one).
export const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiYWotY29kZXNzIiwiYSI6ImNtdW5scGkzcjA5N2Yyd3M4ajl4OGdld3gifQ.yhKZ2AYMMNm-MRzrM9tSMA';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// TODO: point this at your own Mapbox Studio style once it's designed
// (see the earlier "design a custom map style" step). Until then this is
// Mapbox's stock light style.
export const MAPBOX_STYLE_URL = Mapbox.StyleURL.Light;


// run the below before you execute the platform
// doesnt need to be part of the codebase

 //  export MAPBOX_DOWNLOAD_TOKEN=sk.your_secret_token_here
 // source ~/.zshrc

//  then either 
//  npx expo run:android   
//  or
//  npx expo run:ios