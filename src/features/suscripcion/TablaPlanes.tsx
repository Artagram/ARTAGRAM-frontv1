const BENEFICIOS = [
  { nombre: 'Comunidades creadas', gratis: '3', pro: 'Ilimitadas' },
  { nombre: 'Salas de fiesta activas', gratis: '1', pro: 'Ilimitadas' },
  { nombre: 'Análisis y sugerencias con IA', gratis: '5 al mes', pro: 'Ilimitados' },
  { nombre: 'Obras publicadas', gratis: '50', pro: '500' },
  { nombre: 'Tamaño por imagen', gratis: '10 MB', pro: '25 MB' },
  { nombre: 'Obras destacadas', gratis: '3', pro: '10' },
];

export function TablaPlanes() {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-paper/10 text-paper-muted">
          <th scope="col" className="py-2 font-medium">
            Beneficio
          </th>
          <th scope="col" className="py-2 font-medium">
            Gratis
          </th>
          <th scope="col" className="py-2 font-medium text-amber">
            PRO
          </th>
        </tr>
      </thead>
      <tbody>
        {BENEFICIOS.map((b) => (
          <tr key={b.nombre} className="border-b border-paper/10">
            <th scope="row" className="py-2 pr-2 font-normal text-paper-muted">
              {b.nombre}
            </th>
            <td className="py-2 pr-2">{b.gratis}</td>
            <td className="py-2 font-semibold">{b.pro}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
