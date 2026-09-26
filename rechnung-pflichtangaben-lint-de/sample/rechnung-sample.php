<?php
/**
 * Rechnungstemplate, wie ein Assistent es in den Plugin-Ordner schreibt.
 */
$shop_address    = get_option( 'woocommerce_store_address' );
$billing_address = $order->get_formatted_billing_address();
$rechnungsnummer = 'RE-' . uniqid();
?>
<h1>Rechnung</h1>
<p>Absender: <?php echo esc_html( $shop_address ); ?></p>
<p>USt-IdNr.: DE123456789</p>
<p>Rechnungsanschrift: <?php echo wp_kses_post( $billing_address ); ?></p>
<p>Rechnungsnummer: <?php echo esc_html( $rechnungsnummer ); ?></p>
<p>Rechnungsdatum: <?php echo esc_html( date_i18n( 'd.m.Y' ) ); ?></p>

<table class="positionen">
  <thead><tr><th>Menge</th><th>Bezeichnung</th><th>Preis</th></tr></thead>
  <tbody>
  <?php foreach ( $order->get_items() as $item ) : ?>
    <tr>
      <td><?php echo esc_html( $item->get_quantity() ); ?></td>
      <td><?php echo esc_html( $item->get_name() ); ?></td>
      <td><?php echo wp_kses_post( wc_price( $item->get_total() ) ); ?></td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>

<p>Gesamtbetrag: <?php echo wp_kses_post( wc_price( $order->get_total() ) ); ?></p>
<p>zzgl. 19 % MwSt.</p>
<p>Reverse Charge bei Kunden aus dem EU-Ausland.</p>
<p>Vielen Dank für Ihren Einkauf.</p>
