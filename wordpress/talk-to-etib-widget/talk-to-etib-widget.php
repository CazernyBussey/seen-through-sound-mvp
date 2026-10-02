<?php
/**
 * Plugin Name: Talk to ETIB Widget
 * Description: Accessible top and bottom voice-player controls for Even Though I'm Blind.
 * Version: 1.0.1
 * Author: Even Though I'm Blind, Inc.
 */
if (!defined('ABSPATH')) { exit; }
function etib_widget_assets() {
    wp_enqueue_style('etib-voice-widget', plugins_url('widget.css', __FILE__), array(), '1.0.1');
    wp_enqueue_script('etib-voice-widget', plugins_url('widget.js', __FILE__), array(), '1.0.1', true);
}
add_action('wp_enqueue_scripts', 'etib_widget_assets');
function etib_widget_body_class($classes) { $classes[] = 'etib-widget-enabled'; return $classes; }
add_filter('body_class', 'etib_widget_body_class');
function etib_widget_markup() {
    if (is_admin() || is_feed()) { return; }
    echo '<div class="etib-site-widget etib-site-widget-top" data-etib-top><button type="button" data-etib-launcher>Talk to ETIB</button></div>';
    echo '<div class="etib-site-widget etib-site-widget-bottom" role="region" aria-label="Talk to ETIB controls" data-etib-bottom><button type="button" data-etib-launcher>Talk to ETIB</button><p data-etib-feedback role="status" aria-live="polite" aria-atomic="true">Ready.</p><button type="button" data-etib-pause hidden>Pause audio</button><button type="button" data-etib-stop hidden>Stop audio</button></div>';
}
add_action('wp_footer', 'etib_widget_markup', 5);
