module.exports = {
  eventSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      categoria: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'mostre',
            'teatro_e_spettacoli',
            'concerti_e_musica',
            'corsi',
            'seminari_e_conferenze',
            'feste',
            'sagre',
            'enogastronomia',
            'benessere_e_lifestyle',
            'sport',
            'fiere_e_mercatini',
            'laboratorio',
            'lingue_parlate'
          ]
        }
      },
      mood: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'rilassante',
            'party_vibes',
            'chic_e_sofisticato',
            'hip_hop',
            'indie',
            'chill',
            'euforico',
            'creativo',
            'comunitario',
            'scatenato',
            'caloroso',
            'divertente',
            'underground',
            'alternative'
          ]
        }
      },
      accessibilita: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'accessibile_in_sedia_a_rotelle',
            'posti_a_sedere_disponibili',
            'supporto_lis_sottotitoli',
            'sensorialmente_inclusivo',
            'no_strobo_presenti'
          ]
        }
      },
      eta: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'per_tutte_le_eta',
            'bambini',
            'ragazzi',
            'adulti',
            'anziani',
            'genitori_con_bambini',
            '+18'
          ]
        }
      },
      valori: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'inclusivita',
            'parita_di_genere',
            'diversita_culturale',
            'diritti_umani',
            'solidarieta',
            'uguaglianza_sociale',
            'sostenibilita',
            'antifascismo',
            'collaborazione',
            'cura_della_comunita',
            'salute_mentale',
            'valorizzazione_del_territorio',
            'educazione',
            'innovazione',
            'lgbt+',
            'sicuro_per_i_bambini',
            'no_alcool_e_sostanze',
            'ambiente_positivo'
          ]
        }
      }
    },
    required: ['categoria', 'mood', 'accessibilita', 'eta', 'valori'],
    additionalProperties: false
  }
}
