// Marca FormaPlay com letras coloridas: Forma branco + P amarelo, l azul, a verde, y roxo.
// translate="no" impede que o Chrome/Edge traduzam e colapsem os spans (perdendo as cores).
// Estilos inline garantem que nenhum CSS externo sobrescreva as cores.
export function FormaPlayBrand() {
  return (
    <span translate="no" className="notranslate formaplay-brand" style={{ whiteSpace: 'nowrap', fontWeight: 'inherit' }}>
      <span style={{ color: 'inherit' }}>Forma</span>
      <span style={{ color: '#facc15' }}>P</span>
      <span style={{ color: '#3b82f6' }}>l</span>
      <span style={{ color: '#22c55e' }}>a</span>
      <span style={{ color: '#a855f7' }}>y</span>
    </span>
  );
}
