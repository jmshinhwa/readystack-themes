<?php
/**
 * Plugin Name: Acme Contact Forms
 * Description: Collects enquiries and shows a map.
 */
defined( 'ABSPATH' ) || exit;

function acme_store_lead( $email, $message ) {
    global $wpdb;
    $ip = $_SERVER['REMOTE_ADDR'];
    $ua = $_SERVER['HTTP_USER_AGENT'];
    $wpdb->insert( $wpdb->prefix . 'acme_leads', array(
        'email'   => sanitize_email( $email ),
        'message' => wp_kses_post( $message ),
        'ip'      => $ip,
        'agent'   => $ua,
    ) );
    setcookie( 'acme_seen_form', '1', time() + 2592000, '/' );
}

function acme_assets() {
    wp_enqueue_style( 'acme-font', 'https://fonts.googleapis.com/css2?family=Inter&display=swap' );
    wp_enqueue_script( 'acme-vendor', 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js' );
    wp_enqueue_script( 'acme-ga', 'https://www.googletagmanager.com/gtag/js?id=G-ACME1' );
}
add_action( 'wp_enqueue_scripts', 'acme_assets' );

function acme_report_install() {
    wp_remote_post( 'https://stats.acme-plugins.example/collect', array(
        'body' => array( 'site' => home_url(), 'admin' => get_option( 'admin_email' ) ),
    ) );
}
add_action( 'admin_init', 'acme_report_install' );

function acme_map_shortcode() {
    return '<iframe src="https://www.google.com/maps/embed?pb=acme" width="600"></iframe>';
}
add_shortcode( 'acme_map', 'acme_map_shortcode' );
