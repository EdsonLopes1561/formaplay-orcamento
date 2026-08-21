# Geografia FormaPlay

Este diret√≥rio cont√©m os dados geogr√°ficos e coordenadas utilizados pela camada de Presen√ßa Comercial da aplica√ß√£o.

## Fonte de Coordenadas Municipais

*   **Fonte:** kelvins/municipios-brasileiros
*   **Reposit√≥rio:** https://github.com/kelvins/municipios-brasileiros
*   **Licen√ßa:** MIT License
*   **Data de obten√ß√£o:** 2026-08-21
*   **Campos utilizados:** `codigo_ibge`, `latitude`, `longitude`

## Transforma√ß√£o
Os dados originais foram processados para remover campos redundantes (como nome do munic√≠pio e estado, que j√° constam na base `cidades_br.json`) a fim de otimizar o tamanho do *bundle* e carregamento no navegador. O v√≠nculo de chave prim√°ria entre os datasets d√°-se estritamente pela propriedade `codigoIbge`.


## Malha estadual do Brasil

- **Fonte da geometria**: giuliano-macedo/geodata-br-states
- **LicenÁa**: MIT
- **Data de obtenÁ„o**: 2026-08-20
- **Arquivo de origem**: geojson/br_states.json
- **Processo de simplificaÁ„o**: Geometria simplificada usando o algoritmo de Douglas-Peucker (toler‚ncia 0.015) e precis„o de coordenadas truncadas para 3 casas decimais usando script Node.js. Isso reduziu o arquivo de 5.6MB para ~305KB.
- **Propriedades padronizadas pelo FormaPlay**: uf, nome, codigoIbge.
- **Finalidade do arquivo**: RenderizaÁ„o otimizada para web no MapaBrasilPresenca usando React Simple Maps.

O arquivo rasil_estados.json È uma vers„o derivada/simplificada estritamente para visualizaÁ„o web.
