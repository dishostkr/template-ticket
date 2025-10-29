import { 
    StringSelectMenuInteraction, 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { ticketSystem } from '../utils/ticketSystem';

const CATEGORY_NAMES: { [key: string]: string } = {
    'general': '일반문의',
    'report': '신고',
    'event': '이벤트'
};

export async function handleTicketMenuInteraction(interaction: StringSelectMenuInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ 
            content: '이 기능은 서버에서만 사용할 수 있습니다.', 
            ephemeral: true 
        });
        return;
    }

    // 스팸 방지: 이미 활성 티켓이 있는지 확인
    if (ticketSystem.hasActiveTicket(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({ 
            content: '❌ 이미 진행 중인 문의가 있습니다.', 
            ephemeral: true 
        });
        return;
    }

    const setup = ticketSystem.getSetup(interaction.guild.id);
    if (!setup) {
        await interaction.reply({ 
            content: '티켓 시스템이 설정되지 않았습니다.', 
            ephemeral: true 
        });
        return;
    }

    const selectedCategory = interaction.values[0];
    const categoryName = CATEGORY_NAMES[selectedCategory] || selectedCategory;

    await interaction.deferReply({ ephemeral: true });

    try {
        // 카테고리 채널 가져오기
        const category = await interaction.guild.channels.fetch(setup.categoryParent);
        if (!category || category.type !== ChannelType.GuildCategory) {
            await interaction.editReply('카테고리를 찾을 수 없습니다.');
            return;
        }

        // 스태프 역할 가져오기
        const staffRole = await interaction.guild.roles.fetch(setup.staffRole);
        if (!staffRole) {
            await interaction.editReply('스태프 역할을 찾을 수 없습니다.');
            return;
        }

        // 티켓 채널 생성
        const channelName = `${categoryName}-${interaction.user.username}`;
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id, // 티켓 생성자
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: staffRole.id, // 스태프 역할
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: interaction.client.user.id, // 봇
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // 티켓 정보 저장
        ticketSystem.addTicket(interaction.guild.id, {
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            category: selectedCategory,
            active: true
        });

        // 티켓 채널에 환영 메시지 전송
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`📩 ${CATEGORY_NAMES[selectedCategory]} 티켓`)
            .setDescription(`<@${interaction.user.id}> 님, <@&${staffRole.id}> 님.\n\n**[${CATEGORY_NAMES[selectedCategory]}]** 티켓이 생성되었습니다.\n문의 내용을 남겨주세요.`)
            .setColor(0x5865F2)
            .setTimestamp();

        const closeButton = new ButtonBuilder()
            .setCustomId('close-ticket-button')
            .setLabel('문의 종료')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(closeButton);

        await ticketChannel.send({
            content: `<@${interaction.user.id}> <@&${staffRole.id}>`,
            embeds: [welcomeEmbed],
            components: [row]
        });

        await interaction.editReply(`✅ 티켓이 생성되었습니다: <#${ticketChannel.id}>`);
    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply('티켓 생성 중 오류가 발생했습니다.');
    }
}
