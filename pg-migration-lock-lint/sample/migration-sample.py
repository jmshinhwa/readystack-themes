from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0041_order_totals")]

    operations = [
        migrations.AddIndex(model_name="order", index=models.Index(fields=["tenant_id"], name="idx_order_tenant")),
        migrations.AlterField(model_name="order", name="amount_cents", field=models.DecimalField(max_digits=12, decimal_places=2)),
        migrations.RenameField(model_name="order", old_name="legacy_total", new_name="total_cents"),
        migrations.RemoveField(model_name="order", name="legacy_notes"),
        migrations.RunPython(backfill_tenant, migrations.RunPython.noop),
    ]
