# Geografia FormaPlay

Este diretório contém os dados geográficos e coordenadas utilizados pela camada de Presença Comercial da aplicação.

## Fonte de Coordenadas Municipais

*   **Fonte:** kelvins/municipios-brasileiros
*   **Repositório:** https://github.com/kelvins/municipios-brasileiros
*   **Licença:** MIT License
*   **Data de obtenção:** 2026-08-21
*   **Campos utilizados:** `codigo_ibge`, `latitude`, `longitude`

## Transformação
Os dados originais foram processados para remover campos redundantes (como nome do município e estado, que já constam na base `cidades_br.json`) a fim de otimizar o tamanho do *bundle* e carregamento no navegador. O vínculo de chave primária entre os datasets dá-se estritamente pela propriedade `codigoIbge`.
