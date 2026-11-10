const BENEFICIOS = [
  { nombre: 'Comunidades creadas', gratis: '3', pro: 'Ilimitadas' },
  { nombre: 'Salas de fiesta activas', gratis: '1', pro: 'Ilimitadas' },
  { nombre: 'Análisis y sugerencias con IA', gratis: '5 al mes', pro: 'Ilimitados' },
  { nombre: 'Obras publicadas', gratis: '50', pro: '500' },
  { nombre: 'Tamaño por imagen', gratis: '10 MB', pro: '25 MB' },
  { nombre: 'Obras destacadas', gratis: '3', pro: '10' },
];

const BRILLO_PRO = 'bg-amber/5 shadow-[inset_0_0_24px_rgba(255,194,75,0.08)]';

export function TablaPlanes() {
  return (
    <table className="w-full border-separate border-spacing-0 text-left text-sm">
      <thead>
        <tr className="text-paper-muted">
          <th scope="col" className="py-2 font-medium">
            Beneficio
          </th>
          <th scope="col" className="py-2 font-medium">
            Gratis
          </th>
          <th scope="col" className={`rounded-t-xl border-x border-t border-amber/60 px-3 py-2 font-semibold text-amber ${BRILLO_PRO}`}>
            PRO
          </th>
        </tr>
      </thead>
      <tbody>
        {BENEFICIOS.map((b, i) => (
          <tr key={b.nombre} className="border-t border-paper/10">
            <th scope="row" className="py-2 pr-2 font-normal text-paper-muted">
              {b.nombre}
            </th>
            <td className="py-2 pr-2">{b.gratis}</td>
            <td
              className={`border-x border-amber/60 px-3 py-2 font-semibold ${BRILLO_PRO} ${
                i === BENEFICIOS.length - 1 ? 'rounded-b-xl border-b' : ''
              }`}
            >
              {b.pro}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
