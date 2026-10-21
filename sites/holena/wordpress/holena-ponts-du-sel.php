<?php
/**
 * Plugin Name:       HOLENA — Les Ponts du Sel
 * Description:       Affiche le site animé HOLENA « Les Ponts du Sel » dans une page, avec le code court [holena]. Exemple pour ouvrir directement une rubrique : [holena page="chili"].
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            Collectif HOLENA
 * License:           GPL-2.0-or-later
 * Text Domain:       holena-ponts-du-sel
 */

// Sécurité : on ne lance pas ce fichier en dehors de WordPress
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Code court [holena]
 *
 * Réglages possibles (tous facultatifs) :
 *   page    : rubrique à ouvrir directement : guerande, perou, chili, label, livre, collectif
 *   hauteur : hauteur du cadre, par exemple 90vh ou 800px (par défaut : 100vh)
 */
function holena_ponts_du_sel_code_court( $reglages ) {
	$reglages = shortcode_atts(
		array(
			'page'    => '',
			'hauteur' => '100vh',
		),
		$reglages,
		'holena'
	);

	// Adresse du site, rangé dans le dossier « site » de l'extension
	$adresse = plugins_url( 'site/index.html', __FILE__ );

	// Rubrique demandée : seulement les noms connus
	$rubriques = array( 'guerande', 'perou', 'chili', 'label', 'livre', 'collectif' );
	$page      = sanitize_key( $reglages['page'] );
	if ( in_array( $page, $rubriques, true ) ) {
		$adresse .= '#' . $page;
	}

	// Hauteur : un nombre suivi de px, vh ou %
	$hauteur = preg_match( '/^\d{2,4}(px|vh|%)$/', $reglages['hauteur'] ) ? $reglages['hauteur'] : '100vh';

	$html  = '<div class="holena-ponts-du-sel" style="width:100%;margin:0 0 12px;">';
	$html .= '<iframe src="' . esc_url( $adresse ) . '" title="' . esc_attr__( 'HOLENA — Les Ponts du Sel', 'holena-ponts-du-sel' ) . '"';
	$html .= ' style="display:block;width:100%;height:' . esc_attr( $hauteur ) . ';min-height:560px;border:0;background:#000;"';
	$html .= ' loading="lazy" allow="fullscreen" allowfullscreen></iframe>';
	$html .= '<p style="margin:8px 0 0;text-align:right;font-size:14px;">';
	$html .= '<a href="' . esc_url( $adresse ) . '" target="_blank" rel="noopener">' . esc_html__( 'Ouvrir en plein écran', 'holena-ponts-du-sel' ) . ' ↗</a>';
	$html .= '</p></div>';

	return $html;
}
add_shortcode( 'holena', 'holena_ponts_du_sel_code_court' );
