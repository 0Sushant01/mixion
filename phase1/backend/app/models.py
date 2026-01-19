from django.db import models

# Create your models here.

class Bottle(models.Model):
    id = models.CharField(primary_key=True, max_length=20, editable=False)
    bottle_type = models.CharField(max_length=50, null=True, blank=True)
    ingredient = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.id:
            # Generate ID: b1, b2, ...
            existing_ids = Bottle.objects.values_list('id', flat=True)
            max_num = 0
            for bid in existing_ids:
                if bid.startswith('b'):
                    try:
                        num = int(bid[1:])
                        if num > max_num:
                            max_num = num
                    except ValueError:
                        pass
            self.id = f'b{max_num + 1}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.id
