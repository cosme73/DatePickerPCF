# Componente PCF: DateRangePicker

Un componente personalizado avanzado de selección de rango de fechas (y hora opcional) construido para Power Apps usando el Power Apps Component Framework (PCF) junto con React.

## Tecnologías Utilizadas
- **React**: Para el renderizado de la interfaz de usuario moderna y el manejo de estado complejo.
- **TypeScript**: Para garantizar un código seguro, tipado y escalable de la mano del Manifest de PCF.
- **date-fns**: Librería principal para todas las operaciones y cálculos lógicos de fechas (elegida por su enorme modularidad frente a alternativas pesadas como Moment.js).
- **Power Apps Component Framework (PCF)**: El framework nativo de Microsoft usado para empaquetar y enlazar el componente con los inputs y outputs de Power Apps (Canvas & Model-Driven).
- **React Portals (`ReactDOM.createPortal`)**: Técnica utilizada para inyectar el calendario directamente en el la capa superficial de la página (`body`), solucionando el clásico comportamiento destructivo donde Power Apps esconde elementos si sobrepasan el borde del Input (`overflow: hidden`).

---

## 🚀 Funcionalidades Principales
1. **Selección de Rango:** Interfaz intuitiva enfocada en la selección de intervalos temporales ("Desde" y "Hasta").
2. **Control de Horas Incorporado:** Permite elegir la hora y los minutos exactos de los márgenes si se activa la propiedad `allowTime` desde Power Apps.
3. **Límites de Fecha Restringidos:** Exposición de las variables `minDate` y `maxDate` que bloquean visual y reactivamente cualquier día fuera de rango estricto.
4. **Placeholder Dinámico:** Una propiedad de personalización desde Panel Lateral sin requerir edición de código.
5. **Herencia Dinámica (Font-Family):** El componente extrae la familia de la tipografía asignada desde el Estudio de Power Apps al diseño principal y la inyecta manualmente a los Portals superpuestos.

---

## Requisitos Previos (Dependencias de Desarrollo)
Asegúrate de tener instaladas las siguientes herramientas en tu entorno local:
1. [Node.js](https://nodejs.org/) (versión LTS).
2. [Microsoft Power Platform CLI (`pac`)](https://learn.microsoft.com/es-es/power-apps/developer/data-platform/powerapps-cli).
3. [.NET Core SDK](https://dotnet.microsoft.com/download) (para ejecución del sub-motor `dotnet build`).

---

## 🛠 Flujo de Ejecución y Pruebas Locales

Las siguientes instrucciones debes correrlas asegurándote de usar una terminal apuntando a tu carpeta raíz de programación (donde reside el `package.json`).
`cd "d:\Proyectos\PA React Componentes\DatePicker"`

### 1. Instalar Dependencias
Si acabas de clonar el proyecto, descarga todos los sub-módulos necesarios primero:
```bash
npm install
```

### 2. Actualizar Tipos (Opcional pero recomendable)
Si modificas el archivo `ControlManifest.Input.xml` agregando nuevas propiedades o inputs/outputs, debes regenerar de inmediato las declaraciones para que el TypeScript no produzca errores:
```bash
npm run refreshTypes
```

### 3. Compilar el Código a Memoria
Valida rápidamente si el código tiene algún error estructural de sintaxis que impida montar el paquete:
```bash
npm run build
```

### 4. Sandbox de Desarrollo Múltiple (Watch Mode)
Ejecuta la herramienta emuladora de Power Platform en una ventana de navegador. 
Cualquier cambio que guardes en el `.css` o en tus archivos `.tsx` provocará un recargado en vivo de esta ventana.
```bash
npm start watch
```

---

## 📦 Empaquetado y Despliegue a Power Apps

Toda la lógica de empaquetado final ocurre obligatoriamente en la sub-carpeta de la solución donde reside el archivo `.cdsproj`.

### Método 1: Generar el archivo .zip de Solución (Para Producción)

Para empaquetar el componente en un `.zip` importable en Power Apps, debes crear un proyecto de solución que compile tu código usando MSBuild. Sigue exactamente estos pasos:

1. **Crea la carpeta de soluciones** (por ejemplo, `Solutions`), dirígete hacia esa carpeta y abre una terminal dentro de ella:
```bash
mkdir Solutions
cd Solutions
```

2. **Inicializa el proyecto de solución**.
Ejecuta el siguiente comando. (*Nota: El `--publisher-name` y asociado a tu nombre, como "Cosme", y el `--publisher-prefix` son completamente editables. ¡Cámbialos si necesitas que coincidan con los de tu entorno real!*):
```bash
pac solution init --publisher-name Cosme --publisher-prefix cosme
```

3. **Vincula la solución con el componente**.
Agrega la referencia que apunta hacia la ubicación de tu código fuente (el archivo `.pcfproj`). Si creaste la sub-carpeta a 2 niveles de profundidad como suele pasar, el comando exacto es:
```bash
pac solution add-reference --path ..\..\
```

4. **Restaura dependencias y compila**.
Por último, ejecuta uno de los siguientes comandos para restaurar el proyecto:
```bash
dotnet build
# O también puedes usar:
msbuild /t:restore
```
Y para generar el paquete final, simplemente ejecuta:
```bash
msbuild
```

5. ¡Listo! Al terminar de compilar, abre el explorador de Windows, dirígete a la ruta `Solutions\bin\Debug\` (o la versión de `Release`), y el **archivo `.zip`** que encontrarás allí es el que importarás en **[make.powerapps.com](https://make.powerapps.com/) > Soluciones > Importar**.

### Método 2: Despliegue CLI Directo (En Desarrollo Activo y Testing real)
Si tienes el control `pac auth create` autenticado hacia tu perfil de Power Apps, puedes ahorrar saltos inyectando el componente pre-compilado directamente contra un entorno existente sin manipular archivos `.zip`:

```bash
# Ejecutar desde la misma carpeta general donde está el package.json
pac pcf push --publisher-prefix tu_prefijo_asignado
```

---

## 🎨 Personalización Visual (CSS)
Toda la identidad del picker (colores, bordes) se maneja a mano sobre el único archivo `css/DateRangePicker.css`. Se han dejado docenas de comentarios (etiquetados con `/* MODIFICABLE: ... */`) señalando explícitamente qué bloque de código afecta cada comportamiento: fondos por defecto, días bloqueados, estelas de color de rangos intermedios y efectos de pase (hover) del ratón.