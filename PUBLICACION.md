# Publicación del minimarket

Este proyecto ya está listo para publicarse como sitio estático.

## Entrada pública
- `index.html` redirige automáticamente a `loginadmin.html`.

## Opción recomendada: Netlify
1. Ve a Netlify.
2. Sube la carpeta `Pagina de ventas 2.0` que contiene `index.html`.
3. Netlify leerá `netlify.toml` y publicará el sitio.
4. La URL pública quedará similar a `https://tu-sitio.netlify.app`.

## Opción alternativa: GitHub Pages
1. Sube esta carpeta a un repositorio de GitHub.
2. En Settings > Pages, elige la rama y la carpeta raíz.
3. Publica la página.
4. La URL quedará similar a `https://usuario.github.io/repositorio/`.

## Nota
- El archivo `index.html` es la puerta de entrada pública.
- Las rutas internas siguen funcionando con archivos locales relativos.
- Si cambias el nombre de la carpeta raíz, no afecta mientras se publique desde esta misma carpeta.
